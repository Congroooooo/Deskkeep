// Renders only a frame range of a composition (used to finish a render that was cut short).
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const compId = process.argv[2];
const from = Number(process.argv[3]);
const to = Number(process.argv[4]);
const outputDir = join(root, "out", "frames-tail");
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(root, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: compId });
await renderFrames({
  composition, serveUrl, outputDir, imageFormat: "jpeg", jpegQuality: 92,
  frameRange: [from, to], concurrency: 4,
  onFrameUpdate: (f) => { if (f % 30 === 0) console.log("frame " + f); },
});
console.log("tail done");
