import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO } from "../theme";
import vo from "./vo.json";

export const ACCENT = "#f2c94c"; // hype accent (comic bursts, step chips)
export const FPS = 30;
export const sec = (x: number) => Math.round(x * FPS);

// Starburst that spins in, like the comic callouts in the reference.
export const Burst: React.FC<{ x: number; y: number; size: number; color?: string; text?: string; textColor?: string; delay?: number; textSize?: number }> = ({
  x, y, size, color = ACCENT, text, textColor = C.surface, delay = 0, textSize = 64,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 180 } });
  const spin = interpolate(frame - delay, [0, 60], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pts: string[] = [];
  for (let i = 0; i < 28; i++) {
    const r = i % 2 === 0 ? 50 : 40;
    const a = (i / 28) * Math.PI * 2;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: size, height: size, transform: `translate(-50%,-50%) rotate(${spin}deg) scale(${Math.max(0, p)})` }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <polygon points={pts.join(" ")} fill={color} />
      </svg>
      {text && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: textSize, color: textColor, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.05, transform: `rotate(${-spin}deg)` }}>
          {text}
        </div>
      )}
    </div>
  );
};

// Bold word that slams in with overshoot, optionally on a color block.
export const Slam: React.FC<{ text: string; size: number; delay?: number; color?: string; block?: string; x?: number; y?: number }> = ({
  text, size, delay = 0, color = C.ink, block, x = 50, y = 50,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 220, mass: 0.7 } });
  const block_ = block ? interpolate(frame - delay, [0, 10], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) scale(${interpolate(p, [0, 1], [2.4, 1])})`, opacity: Math.min(1, p) }}>
      {block && (
        <div style={{ position: "absolute", inset: `-${size * 0.12}px -${size * 0.25}px`, background: block, clipPath: `inset(0 ${100 - block_}% 0 0)`, borderRadius: 8, zIndex: -1 }} />
      )}
      <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: -3, color, whiteSpace: "nowrap", lineHeight: 1 }}>{text}</div>
    </div>
  );
};

// Subtitle bar that types out the line being narrated.
export const Subtitle: React.FC<{ t: number }> = ({ t }) => {
  const line = vo.find((l) => t >= l.start && t < l.start + l.dur + 0.25);
  if (!line) return null;
  const local = t - line.start;
  const chars = Math.min(line.text.length, Math.floor(local * 38));
  return (
    <div style={{ position: "absolute", left: "50%", bottom: 64, transform: "translateX(-50%)", maxWidth: 1400, background: "rgba(23,25,29,0.86)", border: "1px solid rgba(114,167,191,0.35)", borderRadius: 14, padding: "16px 28px", fontFamily: MONO, fontSize: 34, color: C.ink, textAlign: "center", lineHeight: 1.3 }}>
      {line.text.slice(0, chars)}
      <span style={{ opacity: Math.floor(local * 6) % 2 === 0 ? 1 : 0, color: ACCENT }}>▌</span>
    </div>
  );
};

// Heads-up display: chapter label top-left and a progress bar along the bottom edge.
export const Hud: React.FC<{ chapter: string; index: number; t: number; total: number }> = ({ chapter, index, t, total }) => (
  <>
    <div style={{ position: "absolute", left: 48, top: 40, fontFamily: MONO, fontSize: 22, letterSpacing: 4, color: C.muted }}>
      <span style={{ color: ACCENT, fontWeight: 700 }}>{String(index).padStart(2, "0")}</span>{"  "}{chapter.toUpperCase()}
    </div>
    <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${(t / total) * 100}%`, background: C.primarySoft }} />
  </>
);

// Numbered step chip, like the "STEP 1" labels in the tutorial reference.
export const StepBadge: React.FC<{ n: number; label: string; delay?: number }> = ({ n, label, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", left: 60, top: 110, transform: `translateX(${(1 - p) * -60}px)`, opacity: Math.min(1, p), display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ background: ACCENT, color: C.surface, fontFamily: MONO, fontWeight: 700, fontSize: 30, borderRadius: 10, padding: "8px 16px" }}>{String(n).padStart(2, "0")}</div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.ink, letterSpacing: 2 }}>{label.toUpperCase()}</div>
    </div>
  );
};

// Circular stat that counts up to its value.
export const Ring: React.FC<{ value: number; suffix?: string; label: string; x: number; delay?: number; color?: string }> = ({
  value, suffix = "%", label, x, delay = 0, color = C.primarySoft,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const shown = Math.round(value * Math.min(1, Math.max(0, p)));
  const r = 120;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: "50%", transform: "translate(-50%,-50%)", textAlign: "center", opacity: Math.min(1, p) }}>
      <svg width={280} height={280} viewBox="0 0 280 280">
        <circle cx={140} cy={140} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={18} fill="none" />
        <circle cx={140} cy={140} r={r} stroke={color} strokeWidth={18} fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(1, p) * (value / 100))} transform="rotate(-90 140 140)" />
      </svg>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 64, color: C.ink, marginTop: -190, marginBottom: 150 }}>{shown}{suffix}</div>
      <div style={{ fontFamily: MONO, fontSize: 26, color: C.muted, letterSpacing: 3, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
};

// A bold color block that sweeps across the frame, used for transitions.
export const Wipe: React.FC<{ start: number; dur: number; color: string }> = ({ start, dur, color }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [start, start + dur * 0.5, start + dur], [-100, 0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < start || frame > start + dur) return null;
  return <AbsoluteFill style={{ background: color, transform: `translateX(${x}%)` }} />;
};
