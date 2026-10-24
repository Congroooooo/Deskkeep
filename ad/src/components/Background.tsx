import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

// Dark surface with two slowly drifting steel-blue glows, like the reference's ambient light.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 50 + Math.sin(frame / 95) * 14;
  const y = 38 + Math.cos(frame / 120) * 10;
  const x2 = 80 + Math.cos(frame / 140) * 8;
  return (
    <AbsoluteFill style={{ background: C.surface, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, rgba(71,125,152,0.38), transparent 55%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x2}% 92%, rgba(114,167,191,0.16), transparent 50%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(23,25,29,0) 60%, rgba(23,25,29,0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
