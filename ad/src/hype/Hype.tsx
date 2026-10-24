import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Fade } from "../components/Fade";
import { Screen } from "../components/Screen";
import { Cursor, Key } from "../components/Cursor";
import { Callout } from "../components/Callout";
import { C, MONO } from "../theme";
import { ACCENT, Burst, FPS, Hud, Ring, Slam, StepBadge, Subtitle, Wipe, sec } from "./parts";

export const HYPE_SECONDS = 72;
export const HYPE_FRAMES = sec(HYPE_SECONDS);

const TOTAL = HYPE_SECONDS;
const fadeOpts = { inFrames: 8, outFrames: 8 };

// Brand mark, same geometry as the app icon.
const Mark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 160 160">
    <rect x="0" y="0" width="160" height="160" rx="36" fill={C.surface} />
    <path d="M46 36 H84 A44 44 0 0 1 84 124 H46 Z" fill={C.primary} />
    <circle cx="82" cy="72" r="10" fill={C.surface} />
    <rect x="78" y="78" width="8" height="22" rx="3" fill={C.surface} />
    <rect x="26" y="132" width="108" height="6" rx="3" fill={C.primarySoft} />
  </svg>
);

// Scene 1 (0-10s): hook. Slammed words on a color block, then app names fly in and shake.
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const apps = ["Passwords", "Notes", "Tasks", "Calendar", "Money", "Renewals"];
  const shake = Math.sin(frame / 3) * (frame > sec(3.5) ? 6 : 0);
  return (
    <>
      <Slam text="STOP." size={250} x={30} y={28} delay={4} />
      <Slam text="JUGGLING" size={170} x={50} y={50} delay={sec(0.6)} block={C.primary} color={C.ink} />
      <Slam text="APPS." size={250} x={70} y={72} delay={sec(1.2)} color={ACCENT} />
      {apps.map((a, i) => {
        const p = spring({ frame: frame - sec(3.2) - i * 4, fps: FPS, config: { damping: 14 } });
        const ang = (i / apps.length) * Math.PI * 2 + 0.4;
        const x = 50 + Math.cos(ang) * 38;
        const y = 50 + Math.sin(ang) * 34;
        return (
          <div
            key={a}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%,-50%) translate(${shake * (i % 2 ? 1 : -1)}px,0) scale(${Math.max(0, p)}) rotate(${(i % 2 ? -4 : 3)}deg)`,
              fontFamily: MONO,
              fontSize: 30,
              fontWeight: 700,
              color: C.surface,
              background: C.ink,
              border: `2px solid ${C.primarySoft}`,
              borderRadius: 12,
              padding: "10px 20px",
              opacity: Math.min(1, p),
            }}
          >
            {a}
          </div>
        );
      })}
    </>
  );
};

// Scene 2 (10-12s): the question, on a comic burst.
const Question: React.FC = () => (
  <>
    <Burst x={50} y={50} size={760} color={ACCENT} text={"SOUND\nFAMILIAR?"} textColor={C.surface} textSize={100} delay={0} />
  </>
);

// Scene 3 (12-17s): reveal. A color wipe, then the mark and the name.
const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - sec(0.6), fps, config: { damping: 12 } });
  const typed = Math.min(8, Math.floor(interpolate(frame, [sec(1.2), sec(2.6)], [0, 8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  return (
    <>
      <Wipe start={0} dur={sec(0.9)} color={C.primary} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 46, transform: `scale(${0.6 + 0.4 * p})`, opacity: p }}>
          <Mark size={220} />
          <div style={{ fontFamily: MONO, fontSize: 190, fontWeight: 700, color: C.ink, letterSpacing: -5, whiteSpace: "nowrap", clipPath: `inset(0 ${100 - (typed / 8) * 100}% 0 0)` }}>Deskkeep</div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 42, color: C.primarySoft, opacity: interpolate(frame, [sec(2.8), sec(3.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          Your private workspace, kept local.
        </div>
      </AbsoluteFill>
    </>
  );
};

// Scene 4 (17-20s): everything snaps into one desk.
const OneDesk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tiles = ["Vault", "Notes", "Tasks", "Calendar", "Income", "Subscriptions"];
  return (
    <>
      <Slam text="ONE DESK." size={150} x={50} y={20} delay={0} color={C.ink} />
      <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%,-50%)", display: "grid", gridTemplateColumns: "repeat(3, 300px)", gap: 24 }}>
        {tiles.map((t, i) => {
          const from = i < 3 ? -900 : 900;
          const p = spring({ frame: frame - i * 5, fps, config: { damping: 15 } });
          return (
            <div
              key={t}
              style={{
                height: 150,
                borderRadius: 18,
                background: i % 2 ? C.surfaceRaised : "#1f2a31",
                border: `2px solid ${i % 2 ? C.primarySoft : C.primary}`,
                display: "grid",
                placeItems: "center",
                fontFamily: MONO,
                fontSize: 34,
                fontWeight: 700,
                color: C.ink,
                transform: `translateX(${(1 - p) * from}px)`,
                opacity: Math.min(1, p),
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </>
  );
};

// Steps (20-47s): real screens with a step chip, a cursor, and callouts.
const VaultStep: React.FC = () => {
  const keys: Key[] = [
    { f: 0, x: 62, y: 58 },
    { f: sec(1.1), x: 90.3, y: 18 },
    { f: sec(2.0), x: 90.3, y: 18 },
    { f: sec(6), x: 90.3, y: 18 },
  ];
  return (
    <>
      <StepBadge n={1} label="Vault" delay={2} />
      <Screen src="shots/vault.png" top={650} width={1440} duration={sec(6)} zoom={[1, 1.1]} focus={[88, 18]} enter={4}>
        <Cursor keys={keys} clicks={[sec(2.0)]} />
        <Callout x={84} y={24} text="Copied. Clears in 30s" delay={sec(2.1)} side="left" />
      </Screen>
    </>
  );
};

const NotesStep: React.FC = () => (
  <>
    <StepBadge n={2} label="Notes" delay={2} />
    <Screen src="shots/notes.png" top={650} width={1440} duration={sec(5.7)} zoom={[1, 1.06]} focus={[40, 40]} enter={4}>
      <Callout x={22} y={22} text="Import .md file" delay={sec(1.4)} side="right" />
    </Screen>
  </>
);

const TasksStep: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = sec(1.7);
  const b = sec(3.2);
  const keys: Key[] = [
    { f: 0, x: 60, y: 60 },
    { f: a - 22, x: 21, y: 22 },
    { f: a, x: 21, y: 22 },
    { f: b, x: 52, y: 30 },
    { f: sec(5.2), x: 60, y: 60 },
  ];
  const gx = interpolate(frame, [a, b], [21, 52], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gy = interpolate(frame, [a, b], [22, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const go = interpolate(frame, [a, a + 6, b + 2, b + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const landed = spring({ frame: frame - (b + 2), fps, config: { damping: 14 } });
  return (
    <>
      <StepBadge n={3} label="Tasks" delay={2} />
      <Screen src="shots/tasks.png" top={650} width={1440} duration={sec(5.1)} zoom={[1, 1.03]} focus={[50, 50]} enter={4}>
        <div style={{ position: "absolute", left: "15.2%", top: "19.8%", width: "25%", height: "4.4%", background: C.surfaceRaised, opacity: interpolate(frame, [b + 2, b + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
        <div style={{ position: "absolute", left: `${gx}%`, top: `${gy}%`, transform: "translate(-50%,-50%) rotate(-2deg)", width: 430, padding: "14px 18px", borderRadius: 12, background: C.surfaceRaised, border: `1px solid ${C.primary}`, boxShadow: "0 30px 60px rgba(0,0,0,0.55)", fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.ink, opacity: go }}>
          Design the onboarding flow
        </div>
        <div style={{ position: "absolute", left: "34%", top: "29.5%", transform: `translate(-50%,-50%) scale(${landed})`, opacity: landed }}>
          <Callout x={0} y={0} text="Moved to In Progress" delay={0} side="right" />
        </div>
        <Cursor keys={keys} />
      </Screen>
    </>
  );
};

const CalendarStep: React.FC = () => (
  <>
    <StepBadge n={4} label="Calendar" delay={2} />
    <Screen src="shots/calendar.png" top={650} width={1440} duration={sec(5.8)} zoom={[1, 1.04]} focus={[80, 60]} enter={4}>
      <Callout x={86.5} y={62} text="Today" delay={sec(1)} side="left" />
      <Callout x={51.6} y={88.8} text="+2 more" delay={sec(2.2)} side="right" />
    </Screen>
  </>
);

const MoneyStep: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={sec(2.5)}>
      <StepBadge n={5} label="Income" delay={2} />
      <Screen src="shots/income.png" top={650} width={1440} duration={sec(2.5)} zoom={[1, 1.05]} focus={[50, 40]} enter={4} />
    </Sequence>
    <Sequence from={sec(2.5)} durationInFrames={sec(2.5)}>
      <StepBadge n={5} label="Renewals" delay={2} />
      <Screen src="shots/subscriptions.png" top={650} width={1440} duration={sec(2.5)} zoom={[1, 1.05]} focus={[50, 40]} enter={4} />
    </Sequence>
  </>
);

// Plus features, as cards that pop in, with a key cap for the shortcut.
const features: [string, string][] = [
  ["Search everything", "Ctrl + K finds logins, notes, tasks, and payments."],
  ["Strong passwords", "Generate long passwords and check their strength."],
  ["Markdown notes", "Write, preview, and import your files."],
  ["Drag and drop", "Move work from To Do to done."],
  ["World clocks", "Keep time zones for the people you work with."],
  ["Encrypted backup", "One file out. Restore it with your password."],
];
const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <Slam text="PLUS." size={140} x={50} y={16} color={ACCENT} />
      <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%,-50%)", display: "grid", gridTemplateColumns: "repeat(3, 480px)", gap: 26 }}>
        {features.map(([t, b], i) => {
          const p = spring({ frame: frame - sec(0.4) - i * 6, fps, config: { damping: 13, stiffness: 170 } });
          return (
            <div key={t} style={{ background: C.surfaceRaised, border: `2px solid rgba(114,167,191,0.3)`, borderRadius: 20, padding: "28px 30px", transform: `scale(${0.6 + 0.4 * p}) translateY(${(1 - p) * 40}px)`, opacity: Math.min(1, p) }}>
              <div style={{ width: 54, height: 6, borderRadius: 3, background: ACCENT, marginBottom: 18 }} />
              <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{t}</div>
              <div style={{ fontFamily: MONO, fontSize: 22, color: C.muted, lineHeight: 1.4 }}>{b}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// Stats: three rings count up, like the reference's proof card.
const Proof: React.FC = () => (
  <>
    <Slam text="PRIVATE BY DESIGN." size={96} x={50} y={18} color={C.ink} />
    <Ring value={100} label="Local" x={24} delay={sec(0.4)} />
    <Ring value={0} suffix="" label="Accounts" x={50} delay={sec(0.9)} color={ACCENT} />
    <Ring value={0} suffix="" label="Cloud uploads" x={76} delay={sec(1.4)} color={C.primarySoft} />
  </>
);

// Closing call to action with the logo lockup.
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 2, fps, config: { damping: 12 } });
  const chips = ["Windows-first", "Works offline", "Encrypted", "No account"];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, transform: `scale(${0.7 + 0.3 * pop})`, opacity: pop }}>
        <Mark size={170} />
        <div style={{ fontFamily: MONO, fontSize: 170, fontWeight: 700, color: C.ink, letterSpacing: -4 }}>Deskkeep</div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 44, color: C.primarySoft, opacity: interpolate(frame, [sec(0.8), sec(1.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        One desk. Every day.
      </div>
      <div style={{ display: "flex", gap: 16, opacity: interpolate(frame, [sec(1.6), sec(2.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {chips.map((c) => (
          <div key={c} style={{ fontFamily: MONO, fontSize: 24, color: C.ink, border: `1px solid ${C.primary}`, borderRadius: 999, padding: "12px 24px", background: "rgba(71,125,152,0.14)" }}>{c}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// The timeline. Every scene fades in and out, and the subtitle and HUD run across all of them.
const scenes: { from: number; to: number; chapter: string; C: React.FC }[] = [
  { from: 0, to: 10, chapter: "Hook", C: Hook },
  { from: 10, to: 12, chapter: "Question", C: Question },
  { from: 12, to: 16.9, chapter: "Reveal", C: Reveal },
  { from: 16.9, to: 19.9, chapter: "One desk", C: OneDesk },
  { from: 19.9, to: 26, chapter: "Vault", C: VaultStep },
  { from: 26, to: 31.7, chapter: "Notes", C: NotesStep },
  { from: 31.7, to: 36.8, chapter: "Tasks", C: TasksStep },
  { from: 36.8, to: 42.6, chapter: "Calendar", C: CalendarStep },
  { from: 42.6, to: 47.6, chapter: "Money", C: MoneyStep },
  { from: 47.6, to: 54.1, chapter: "Plus", C: Features },
  { from: 54.1, to: 60.7, chapter: "Proof", C: Proof },
  { from: 60.7, to: 72, chapter: "Call to action", C: Cta },
];

// The frame-driven clock in seconds, used by the subtitle and the HUD.
const Clock: React.FC<{ children: (t: number) => React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return <>{children(frame / FPS)}</>;
};

export const Hype: React.FC = () => (
  <AbsoluteFill style={{ background: C.surface }}>
    <Background />
    {scenes.map(({ from, to, C: Scene }) => (
      <Sequence key={from} from={sec(from)} durationInFrames={sec(to) - sec(from)}>
        <Fade {...fadeOpts}>
          <Scene />
        </Fade>
      </Sequence>
    ))}
    <Clock>
      {(t) => {
        const idx = scenes.findIndex((s) => t >= s.from && t < s.to);
        const scene = scenes[idx === -1 ? scenes.length - 1 : idx];
        return (
          <>
            <Hud chapter={scene.chapter} index={idx + 1} t={t} total={TOTAL} />
            <Subtitle t={t} />
          </>
        );
      }}
    </Clock>
  </AbsoluteFill>
);
