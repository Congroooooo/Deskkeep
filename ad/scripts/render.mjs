// Renders a composition to out/<name>.mp4.
// Usage: node scripts/render.mjs [compositionId] [outputName] [audioMixWav]
// Remotion draws each frame in headless Chrome; the system FFmpeg encodes the frames and adds the audio.
// This avoids the Remotion-bundled encoder, which Windows Application Control blocks on this machine.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const compId = process.argv[2] || "DeskkeepAd";
const outName = process.argv[3] || "deskkeep-ad";
const audio = process.argv[4] || join(root, "public", "audio", "deskkeep-theme.wav");
const FFMPEG = "C:/Users/Nicko/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const outDir = join(root, "out");
const framesDir = join(outDir, `frames-${compId}`);
const output = join(outDir, `${outName}.mp4`);

if (!existsSync(FFMPEG)) throw new Error("System FFmpeg not found at " + FFMPEG);
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

console.log("Bundling composition...");
const serveUrl = await bundle({ entryPoint: join(root, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: compId });
console.log(`Rendering ${compId}: ${composition.durationInFrames} frames at ${composition.fps} fps...`);

await renderFrames({
  composition,
  serveUrl,
  outputDir: framesDir,
  imageFormat: "jpeg",
  jpegQuality: 92,
  onFrameUpdate: (frame) => {
    if (frame % 150 === 0) console.log(`  frame ${frame}/${composition.durationInFrames}`);
  },
  concurrency: 4,
});

console.log("Encoding video...");
execFileSync(FFMPEG, [
  "-y",
  "-framerate", String(composition.fps),
  "-i", join(framesDir, "element-%04d.jpeg"),
  "-i", audio,
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
  "-c:a", "aac", "-b:a", "192k",
  "-shortest", "-movflags", "+faststart",
  output,
], { stdio: "inherit" });

rmSync(framesDir, { recursive: true, force: true });
console.log("Wrote " + output);
