import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

// A real app screenshot in a framed window. It springs in, slowly zooms toward a focus point,
// and its children (cursor, highlights) are placed in percent of the screenshot, so they move with it.
export const Screen: React.FC<{
  src: string;
  width?: number;
  top?: number;
  zoom?: [number, number];
  focus?: [number, number];
  enter?: number;
  duration?: number;
  children?: React.ReactNode;
}> = ({ src, width = 1440, top = 620, duration = 150, zoom = [1, 1.04], focus = [50, 50], enter = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - enter, fps, config: { damping: 200 } });
  const s = interpolate(frame, [0, duration], zoom, { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top,
        width,
        transform: `translate(-50%, -50%) translateY(${(1 - p) * 70}px) scale(${0.97 + 0.03 * p})`,
        opacity: p,
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 50px 140px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)",
          background: C.surface,
        }}
      >
        <div style={{ transform: `scale(${s})`, transformOrigin: `${focus[0]}% ${focus[1]}%` }}>
          <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
          <div style={{ position: "absolute", inset: 0 }}>{children}</div>
        </div>
      </div>
    </div>
  );
};
