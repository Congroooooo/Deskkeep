import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "./components/Background";
import { Headline } from "./components/Headline";
import { Kicker } from "./components/Caption";
import { Fade } from "./components/Fade";
import { Screen } from "./components/Screen";
import { Cursor, Key } from "./components/Cursor";
import { Callout } from "./components/Callout";
import { C, MONO } from "./theme";

// 30 fps, 60 seconds, 1920x1080. Scenes follow problem -> reveal -> features -> proof -> call to action.
export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
export const AD_FRAMES = s(60);

// ---------- Shared pieces ----------

// Title block pinned to the top of a screen scene.
const TopTitle: React.FC<{ kicker: string; text: string; highlight?: string[]; size?: number }> = ({ kicker, text, highlight, size = 64 }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 70 }}>
    <Kicker label={kicker} />
    <Headline text={text} highlight={highlight} size={size} stagger={3} />
  </AbsoluteFill>
);

// Deskkeep mark, drawn with the same geometry as the brand icon.
const Mark: React.FC<{ size: number; draw?: number }> = ({ size, draw = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 160 160" style={{ transform: `scale(${draw})`, transformOrigin: "center" }}>
    <rect x="0" y="0" width="160" height="160" rx="36" fill={C.surface} />
    <path d="M46 36 H84 A44 44 0 0 1 84 124 H46 Z" fill={C.primary} />
    <circle cx="82" cy="72" r="10" fill={C.surface} />
    <rect x="78" y="78" width="8" height="22" rx="3" fill={C.surface} />
    <rect x="26" y="132" width="108" height="6" rx="3" fill={C.primarySoft} />
  </svg>
);

// A floating feature card, used in the features grid.
const FeatureCard: React.FC<{ title: string; body: string; delay: number; index: number }> = ({ title, body, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 150 } });
  const float = Math.sin((frame + index * 17) / 22) * 4;
  return (
    <div
      style={{
        opacity: Math.min(1, p),
        transform: `translateY(${(1 - p) * 60 + float}px) scale(${0.9 + 0.1 * p})`,
        background: C.surfaceRaised,
        border: `1px solid rgba(114,167,191,0.22)`,
        borderRadius: 18,
        padding: "26px 28px",
        width: 400,
        boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ width: 44, height: 4, borderRadius: 2, background: C.primarySoft, marginBottom: 18 }} />
      <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{title}</div>
      <div style={{ fontFamily: MONO, fontSize: 21, lineHeight: 1.45, color: C.muted }}>{body}</div>
    </div>
  );
};

// ---------- Scenes (times are local to each scene) ----------

// 0.0 - 5.0s: the problem, stated as a hook with floating app names.
const SceneHook = () => {
  const frame = useCurrentFrame();
  const chips: [string, number, number][] = [
    ["Passwords", 10, 18], ["Sticky notes", 72, 14], ["Spreadsheet", 6, 64], ["Calendar", 90, 66],
    ["Task list", 26, 86], ["Bank app", 88, 30], ["Renewal emails", 56, 88], ["Notes app", 36, 12],
  ];
  return (
    <Fade>
      <Background />
      {chips.map(([label, x, y], i) => {
        const appear = spring({ frame: frame - 4 - i * 3, fps: FPS, config: { damping: 18 } });
        const drift = Math.sin((frame + i * 9) / 18) * 10;
        return (
          <div
            key={label}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) translateY(${drift}px) scale(${appear})`,
              opacity: Math.min(0.85, appear),
              fontFamily: MONO,
              fontSize: 26,
              color: C.muted,
              background: "rgba(32,35,41,0.9)",
              border: "1px solid rgba(154,163,173,0.25)",
              borderRadius: 14,
              padding: "12px 22px",
            }}
          >
            {label}
          </div>
        );
      })}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Headline text="Your life is spread across too many apps." size={104} highlight={["too", "many"]} stagger={4} />
      </AbsoluteFill>
    </Fade>
  );
};

// 5.0 - 11.0s: three questions that everyone has asked, one after another.
const questions = ["Where did I save that login?", "Which renewal is due Friday?", "Did I log this month's income?"];
const SceneProblem = () => (
  <Fade>
    <Background />
    {questions.map((q, i) => (
      <Sequence key={q} from={i * 60} durationInFrames={60}>
        <Fade inFrames={8} outFrames={8}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <Headline text={q} size={100} highlight={["login?", "Friday?", "income?"]} stagger={3} />
          </AbsoluteFill>
        </Fade>
      </Sequence>
    ))}
  </Fade>
);

// 11.0 - 15.0s: the reveal, the mark draws in and the name types out.
const SceneReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drawn = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const typed = Math.min(8, Math.floor(interpolate(frame, [18, 52], [0, 8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const tag = interpolate(frame, [60, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Fade>
      <Background />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ opacity: drawn }}>
            <Mark size={210} draw={0.9 + 0.1 * drawn} />
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 176,
              fontWeight: 700,
              color: C.ink,
              letterSpacing: -4,
              whiteSpace: "nowrap",
              clipPath: `inset(0 ${100 - (typed / 8) * 100}% 0 0)`,
            }}
          >
            Deskkeep
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 40, color: C.muted, opacity: tag }}>Your private workspace, kept local.</div>
      </AbsoluteFill>
    </Fade>
  );
};

// 15.0 - 20.0s: the dashboard, one desk for everything.
const SceneDashboard = () => (
  <Fade>
    <Background />
    <TopTitle kicker="One desk" text="Everything you manage, in one place." size={62} highlight={["one", "place."]} />
    <Screen src="shots/dashboard.png" top={645} width={1440} duration={150} zoom={[1, 1.05]} focus={[50, 30]} enter={4}>
      <Callout x={78} y={20} text="Renewals at a glance" delay={34} />
      <Callout x={24} y={58} text="Recent logins" delay={52} side="left" />
    </Screen>
  </Fade>
);

// 20.0 - 26.0s: the vault, copy a login and it clears itself.
const vaultKeys: Key[] = [
  { f: 0, x: 62, y: 58 },
  { f: 30, x: 90.3, y: 18 },
  { f: 60, x: 90.3, y: 18 },
  { f: 150, x: 90.3, y: 18 },
];
const SceneVault = () => (
  <Fade>
    <Background />
    <TopTitle kicker="Passwords" text="Copy a login. It clears itself." size={62} highlight={["clears", "itself."]} />
    <Screen src="shots/vault.png" top={645} width={1440} duration={180} zoom={[1, 1.1]} focus={[88, 18]} enter={4}>
      <Cursor keys={vaultKeys} clicks={[60]} />
      <Callout x={84} y={24} text="Copied. Clears in 30s" delay={68} side="left" />
    </Screen>
  </Fade>
);

// 26.0 - 31.0s: notes in Markdown, and importing files.
const SceneNotes = () => (
  <Fade>
    <Background />
    <TopTitle kicker="Notes" text="Write in Markdown. Import your .md files." size={62} highlight={["Markdown.", ".md"]} />
    <Screen src="shots/notes.png" top={645} width={1440} duration={150} zoom={[1, 1.06]} focus={[40, 40]} enter={4}>
      <Callout x={22} y={22} text="Import .md file" delay={40} side="right" />
    </Screen>
  </Fade>
);

// 31.0 - 37.0s: the board. A task is dragged from To Do into In Progress.
const SceneTasks = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const keys: Key[] = [
    { f: 0, x: 60, y: 60 },
    { f: 28, x: 21, y: 22 },
    { f: 50, x: 21, y: 22 },
    { f: 96, x: 52, y: 30 },
    { f: 150, x: 60, y: 60 },
  ];
  const ghostX = interpolate(frame, [50, 96], [21, 52], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ghostY = interpolate(frame, [50, 96], [22, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ghostOpacity = interpolate(frame, [50, 56, 98, 112], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const landed = spring({ frame: frame - 98, fps, config: { damping: 14 } });
  return (
    <Fade>
      <Background />
      <TopTitle kicker="Tasks" text="Drag work across the board." size={62} highlight={["across"]} />
      <Screen src="shots/tasks.png" top={645} width={1440} duration={150} zoom={[1, 1.03]} focus={[50, 50]} enter={4}>
        {/* The original row is covered once the task leaves To Do. */}
        <div style={{ position: "absolute", left: "15.2%", top: "19.8%", width: "25%", height: "4.4%", background: C.surfaceRaised, opacity: interpolate(frame, [96, 102], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
        {/* The dragged card. */}
        <div
          style={{
            position: "absolute",
            left: `${ghostX}%`,
            top: `${ghostY}%`,
            transform: "translate(-50%, -50%) rotate(-2deg)",
            width: 430,
            padding: "14px 18px",
            borderRadius: 12,
            background: C.surfaceRaised,
            border: `1px solid ${C.primary}`,
            boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
            fontFamily: MONO,
            fontSize: 22,
            fontWeight: 700,
            color: C.ink,
            opacity: ghostOpacity,
          }}
        >
          Design the onboarding flow
        </div>
        <div style={{ position: "absolute", left: "34%", top: "29.5%", transform: `translate(-50%,-50%) scale(${landed})`, opacity: landed }}>
          <Callout x={0} y={0} text="Moved to In Progress" delay={0} side="right" />
        </div>
        <Cursor keys={keys} />
      </Screen>
    </Fade>
  );
};

// 37.0 - 42.0s: the calendar keeps every day the same size.
const SceneCalendar = () => (
  <Fade>
    <Background />
    <TopTitle kicker="Calendar" text="Every day stays tidy. Extra items fold into +N more." size={56} highlight={["+N", "more."]} />
    <Screen src="shots/calendar.png" top={645} width={1440} duration={150} zoom={[1, 1.04]} focus={[80, 60]} enter={4}>
      <Callout x={86.5} y={62} text="Today" delay={30} side="left" />
      <Callout x={51.6} y={88.8} text="Click to see all items" delay={56} side="right" />
    </Screen>
  </Fade>
);

// 42.0 - 48.0s: money in, and renewals never missed. Two screens, one after another.
const SceneMoney = () => (
  <Fade>
    <Background />
    <Sequence from={0} durationInFrames={90}>
      <TopTitle kicker="Income" text="Track every payment that comes in." size={60} highlight={["payment"]} />
      <Screen src="shots/income.png" top={645} width={1440} duration={90} zoom={[1, 1.05]} focus={[50, 40]} enter={4} />
    </Sequence>
    <Sequence from={90} durationInFrames={90}>
      <TopTitle kicker="Subscriptions" text="Never miss a renewal again." size={60} highlight={["renewal"]} />
      <Screen src="shots/subscriptions.png" top={645} width={1440} duration={90} zoom={[1, 1.05]} focus={[50, 40]} enter={4} />
    </Sequence>
  </Fade>
);

// 48.0 - 53.0s: the rest of the feature set, as cards that float in.
const features: [string, string][] = [
  ["Ctrl+K search", "Find a login, note, task, or payment from anywhere."],
  ["Password generator", "Long, strong passwords, with a strength check."],
  ["Markdown notes", "Write, preview, and import .md files."],
  ["Drag-and-drop board", "Move tasks from To Do to Done."],
  ["Calendar views", "Month, week, and year, with a day view."],
  ["World clocks", "Keep time zones for the people you work with."],
  ["Encrypted backup", "Export one file. Restore it with your password."],
  ["Auto-lock", "Locks when you step away. Recovery code included."],
];
const SceneFeatures = () => (
  <Fade>
    <Background />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
      <Kicker label="Everything included" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 400px)", gap: 26 }}>
        {features.map(([title, body], i) => (
          <FeatureCard key={title} title={title} body={body} delay={6 + i * 6} index={i} />
        ))}
      </div>
    </AbsoluteFill>
  </Fade>
);

// 53.0 - 56.5s: the promise, stated large.
const ScenePrivacy = () => (
  <Fade>
    <Background />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
      <Kicker label="Private by design" />
      <Headline text="100% local." size={170} highlight={["local."]} stagger={6} />
      <Headline text="No cloud. No account. Works offline." size={56} color={C.muted} delay={24} stagger={3} />
    </AbsoluteFill>
  </Fade>
);

// 56.5 - 60.0s: the logo lockup, the tagline, and the key facts.
const SceneCta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const chips = ["Windows-first", "Works offline", "Encrypted", "No account"];
  return (
    <Fade inFrames={10} outFrames={1}>
      <Background />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34, transform: `scale(${0.85 + 0.15 * pop})`, opacity: pop }}>
          <Mark size={150} />
          <div style={{ fontFamily: MONO, fontSize: 150, fontWeight: 700, color: C.ink, letterSpacing: -4 }}>Deskkeep</div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 42, color: C.primarySoft, opacity: interpolate(frame, [14, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          Your private workspace, kept local.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 14, opacity: interpolate(frame, [30, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {chips.map((c) => (
            <div key={c} style={{ fontFamily: MONO, fontSize: 22, color: C.ink, border: `1px solid ${C.primary}`, borderRadius: 999, padding: "10px 22px", background: "rgba(71,125,152,0.12)" }}>
              {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

// ---------- Timeline ----------

const timeline: { from: number; to: number; C: React.FC }[] = [
  { from: s(0), to: s(5), C: SceneHook },
  { from: s(5), to: s(11), C: SceneProblem },
  { from: s(11), to: s(15), C: SceneReveal },
  { from: s(15), to: s(20), C: SceneDashboard },
  { from: s(20), to: s(26), C: SceneVault },
  { from: s(26), to: s(31), C: SceneNotes },
  { from: s(31), to: s(37), C: SceneTasks },
  { from: s(37), to: s(42), C: SceneCalendar },
  { from: s(42), to: s(48), C: SceneMoney },
  { from: s(48), to: s(53), C: SceneFeatures },
  { from: s(53), to: s(56.5), C: ScenePrivacy },
  { from: s(56.5), to: s(60), C: SceneCta },
];

export const Ad = () => {
  return (
    <AbsoluteFill style={{ background: C.surface }}>
      <Audio
        src={staticFile("audio/deskkeep-theme.wav")}
        volume={(f) => interpolate(f, [0, 24, AD_FRAMES - 60, AD_FRAMES], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      {timeline.map(({ from, to, C: Scene }) => (
        <Sequence key={from} from={from} durationInFrames={to - from}>
          <Scene />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
