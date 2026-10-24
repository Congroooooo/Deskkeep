import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";

// Small step label above a headline, e.g. "STEP 1" or "PRIVATE BY DESIGN".
export const Kicker: React.FC<{ label: string; delay?: number }> = ({ label, delay = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 26,
        letterSpacing: 6,
        color: C.primarySoft,
        textTransform: "uppercase",
        opacity,
        marginBottom: 18,
      }}
    >
      {label}
    </div>
  );
};
