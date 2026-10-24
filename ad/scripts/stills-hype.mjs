// Renders a few still frames of the hype composition for a quick visual check.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "stills");
mkdirSync(outDir, { recursive: true });
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: join(here, "..", "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "DeskkeepHype" });
for (const frame of frames) {
  await renderStill({ composition, serveUrl, frame, output: join(outDir, `hype-${String(frame).padStart(4, "0")}.png`), imageFormat: "png" });
  console.log("still " + frame);
}
