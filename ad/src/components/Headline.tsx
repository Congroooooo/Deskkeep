import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO } from "../theme";

// Big headline that reveals word by word with a spring, like the reference's statement lines.
// Words listed in `highlight` are drawn in the brand's steel blue.
export const Headline: React.FC<{
  text: string;
  highlight?: string[];
  size?: number;
  delay?: number;
  stagger?: number;
  color?: string;
  weight?: number;
  align?: "center" | "left";
}> = ({ text, highlight = [], size = 110, delay = 0, stagger = 4, color = C.ink, weight = 700, align = "center" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.12,
        letterSpacing: -2,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: `0 ${size * 0.26}px`,
        maxWidth: 1600,
      }}
    >
      {words.map((word, i) => {
        const start = delay + i * stagger;
        const p = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 160 } });
        const isHi = highlight.some((h) => word.replace(/[.,!?]/g, "") === h);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: interpolate(p, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
              color: isHi ? C.primarySoft : color,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
