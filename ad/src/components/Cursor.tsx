import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export type Key = { f: number; x: number; y: number };

// Interpolates a cursor path (percent of the screenshot) with an eased curve, and draws click ripples.
export const Cursor: React.FC<{ keys: Key[]; clicks?: number[]; dragging?: boolean }> = ({ keys, clicks = [], dragging = false }) => {
  const frame = useCurrentFrame();
  const frames = keys.map((k) => k.f);
  const x = interpolate(frame, frames, keys.map((k) => k.x), { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, frames, keys.map((k) => k.y), { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      {clicks.map((c, i) => {
        const age = frame - c;
        if (age < 0 || age > 18) return null;
        const r = interpolate(age, [0, 18], [6, 40]);
        const o = interpolate(age, [0, 18], [0.7, 0]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: r * 2,
              height: r * 2,
              marginLeft: -r,
              marginTop: -r,
              borderRadius: "50%",
              border: "3px solid #72a7bf",
              opacity: o,
            }}
          />
        );
      })}
      <svg
        width={34}
        height={40}
        viewBox="0 0 24 28"
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-3px, -2px) scale(${dragging ? 0.9 : 1})`,
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))",
        }}
      >
        <path d="M2 2 L2 22 L7.5 17 L11 25 L14.5 23.5 L11 16 L18.5 16 Z" fill="#ffffff" stroke="#17191d" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  );
};
