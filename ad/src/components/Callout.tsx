import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO } from "../theme";

// A label that pops next to a point of the screenshot, like the reference's feature callouts.
export const Callout: React.FC<{ x: number; y: number; text: string; delay?: number; side?: "left" | "right" }> = ({ x, y, text, delay = 0, side = "right" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180 } });
  const glow = interpolate(Math.sin((frame - delay) / 9), [-1, 1], [0.35, 0.9]);
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${side === "right" ? "14px" : "calc(-100% - 14px)"}, -50%) scale(${Math.max(0, p)})`,
        opacity: Math.min(1, p),
        fontFamily: MONO,
        fontSize: 22,
        fontWeight: 700,
        color: C.ink,
        background: "rgba(32,35,41,0.94)",
        border: `1px solid ${C.primary}`,
        boxShadow: `0 0 ${30 * glow}px rgba(71,125,152,${glow})`,
        padding: "10px 16px",
        borderRadius: 12,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};
