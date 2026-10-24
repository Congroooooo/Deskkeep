// Mixes the narration over the hype track: each voice line is placed at its start time,
// and the music ducks while someone is speaking (sidechain compression).
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const FFMPEG = "C:/Users/Nicko/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const lines = JSON.parse(readFileSync(join(here, "vo-lines.json"), "utf8"));
const music = join(root, "public", "audio", "deskkeep-hype.wav");
const outDir = join(root, "out");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "hype-mix.wav");
const DURATION = 72;

const args = ["-y", "-i", music];
lines.forEach((l) => args.push("-i", join(root, "public", "vo", `vo-${l.id}.wav`)));
const chains = [];
lines.forEach((l, i) => {
  const ms = Math.round(l.start * 1000);
  chains.push(`[${i + 1}:a]adelay=${ms}|${ms},volume=1.15[v${i}]`);
});
const inputs = lines.map((_, i) => `[v${i}]`).join("");
chains.push(`${inputs}amix=inputs=${lines.length}:normalize=0:dropout_transition=0[vo]`);
chains.push("[vo]asplit=2[vo_key][vo_mix]");
chains.push("[0:a]volume=0.72,apad[music]");
chains.push("[music][vo_key]sidechaincompress=threshold=0.04:ratio=6:attack=15:release=350:makeup=1[ducked]");
chains.push("[ducked][vo_mix]amix=inputs=2:normalize=0[pre]");
chains.push("[pre]apad,alimiter=limit=0.95,atrim=end=72[mix]");
args.push("-filter_complex", chains.join(";"), "-map", "[mix]", "-t", String(DURATION), "-ar", "48000", "-ac", "2", out);
execFileSync(FFMPEG, args, { stdio: "inherit" });
console.log("wrote " + out);
