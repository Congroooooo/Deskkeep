// Generates an original upbeat 60-second instrumental (124 BPM) as a WAV file.
// Everything is synthesized here (kick, snare, hats, bass, chord stabs, arpeggio),
// so the track carries no licensing or copyright claims. Run: node scripts/make-music.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[3] ? join(process.cwd(), process.argv[3]) : join(here, "..", "public", "audio", "deskkeep-theme.wav");
const SR = 48000;
const DUR = Number(process.argv[2] || 60);
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

// Deterministic noise so renders are repeatable.
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const noise = new Float32Array(N);
for (let i = 0; i < N; i++) noise[i] = rnd();

const BPM = 124;
const beat = 60 / BPM;
const bar = beat * 4;
const eighth = beat / 2;
const sixteenth = beat / 4;

// Place a sound at a time, panned from -1 (left) to 1 (right).
function place(start, dur, pan, sample) {
  const i0 = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len && i0 + i < N; i++) {
    const v = sample(i / SR, i0 + i);
    L[i0 + i] += v * gl;
    R[i0 + i] += v * gr;
  }
}

const kick = (t) => {
  const f = 46 + 120 * Math.exp(-t * 34);
  const phase = 2 * Math.PI * (46 * t + (120 * (1 - Math.exp(-34 * t))) / 34);
  return Math.sin(phase) * Math.exp(-t * 9) * 0.95 + 0 * f;
};
const snare = (t, i) => {
  const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 28) * 0.25;
  return (noise[i] * 0.6 * Math.exp(-t * 22) + body) * 0.42;
};
const hat = (t, i) => {
  const hp = noise[i] - (i > 0 ? noise[i - 1] : 0);
  return hp * Math.exp(-t * 60) * 0.12;
};
const bass = (freq) => (t) => {
  const attack = Math.min(1, t * 300);
  const env = attack * Math.exp(-t * 2.6);
  const s = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
  return s * env * 0.34;
};
const stab = (freqs) => (t) => {
  const env = Math.min(1, t * 200) * Math.exp(-t * 6.5);
  let s = 0;
  for (const f of freqs) {
    const x = (f * t) % 1;
    s += 4 * Math.abs(x - 0.5) - 1; // triangle wave
  }
  return (s / freqs.length) * env * 0.13;
};
const pluck = (f) => (t) => {
  const env = Math.exp(-t * 14);
  const s = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t);
  return s * env * 0.16;
};

// Chords: Am, F, C, G (2 bars each), with their bass roots and chord tones.
const progression = [
  { root: 110.0, tones: [220.0, 261.63, 329.63] },
  { root: 87.31, tones: [174.61, 220.0, 261.63] },
  { root: 130.81, tones: [261.63, 329.63, 392.0] },
  { root: 98.0, tones: [196.0, 246.94, 293.66] },
];

const totalBars = Math.floor(DUR / bar);
for (let b = 0; b < totalBars; 	b++) {
  const t0 = b * bar;
  const chord = progression[Math.floor(b / 2) % progression.length];
  const energy = b < 2 ? 0.45 : 1; // quiet intro

  // Drums: kick every beat, snare on 2 and 4, hats on every eighth.
  for (let k = 0; k < 4; k++) {
    place(t0 + k * beat, 0.35, 0, (t) => kick(t) * energy);
    if (k % 2 === 1 && b >= 1) place(t0 + k * beat, 0.25, -0.1, (t, i) => snare(t, i) * energy);
  }
  if (b >= 1) {
    for (let e = 0; e < 8; e++) {
      const pan = e % 2 === 0 ? 0.35 : -0.35;
      place(t0 + e * eighth, 0.08, pan, (t, i) => hat(t, i) * energy);
    }
  }

  // Bass: rolling eighths on the root, octave jump on the offbeat, from bar 4 on.
  if (b >= 3) {
    for (let e = 0; e < 8; e++) {
      const f = e % 4 === 3 ? chord.root * 2 : chord.root;
      place(t0 + e * eighth, eighth * 0.9, 0, bass(f));
    }
  }

  // Chord stabs on the offbeats, from bar 2 on.
  if (b >= 2) {
    for (const off of [0.5, 2.5]) {
      place(t0 + off * beat, beat * 0.45, -0.25, stab(chord.tones));
    }
  }

  // Arpeggio: sixteenths through the chord tones, from bar 8 on.
  if (b >= 7) {
    const pattern = [0, 1, 2, 1];
    for (let s = 0; s < 16; s++) {
      const tone = chord.tones[pattern[s % 4] % chord.tones.length];
      const f = s % 8 < 4 ? tone : tone * 2;
      place(t0 + s * sixteenth, sixteenth * 1.4, s % 2 ? 0.5 : -0.5, pluck(f));
    }
  }
}

// Gentle master: fade in, fade out, soft clip.
const fadeIn = SR * 0.6;
const fadeOut = SR * 2.5;
for (let i = 0; i < N; i++) {
  let g = 1;
  if (i < fadeIn) g = i / fadeIn;
  if (i > N - fadeOut) g = Math.min(g, (N - i) / fadeOut);
  L[i] = Math.tanh(L[i] * 1.2 * g) * 0.82;
  R[i] = Math.tanh(R[i] * 1.2 * g) * 0.82;
}

// Write 16-bit stereo PCM WAV.
const dataBytes = N * 2 * 2;
const buf = Buffer.alloc(44 + dataBytes);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2 * 2, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(dataBytes, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
console.log(`wrote ${out} (${DUR}s, ${BPM} BPM)`);
