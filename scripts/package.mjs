// Builds a Windows app folder: release/Deskkeep-win32-x64/Deskkeep.exe
//
// Assembled directly from the Electron runtime in node_modules/electron/dist, so it does not use
// @electron/packager: its ZIP-extraction helper is a native binary that Windows Application Control
// blocks on this machine. Run it through `npm run package`, which builds the interface first.
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const release = join(root, "release");
const out = join(release, "Deskkeep-win32-x64");
const app = join(out, "resources", "app");

if (!existsSync(join(root, "dist", "index.html"))) throw new Error("Build the interface first (npm run build).");

rmSync(release, { recursive: true, force: true });
cpSync(join(root, "node_modules", "electron", "dist"), out, { recursive: true });
rmSync(join(out, "resources", "default_app.asar"), { force: true });
renameSync(join(out, "electron.exe"), join(out, "Deskkeep.exe"));

// The app itself: the main process, the preload bridge, and the built interface.
mkdirSync(app, { recursive: true });
cpSync(join(root, "electron"), join(app, "electron"), { recursive: true });
cpSync(join(root, "dist"), join(app, "dist"), { recursive: true });
writeFileSync(
  join(app, "package.json"),
  JSON.stringify({ name: pkg.name, version: pkg.version, private: true, main: "electron/main.cjs" }, null, 2),
);

// Only the native modules the main process loads at runtime. The interface is already bundled in dist/.
const runtimeModules = ["better-sqlite3", "@node-rs/argon2", "@node-rs/argon2-win32-x64-msvc", "ical.js"];
for (const dep of runtimeModules) {
  cpSync(join(root, "node_modules", dep), join(app, "node_modules", dep), { recursive: true });
}

console.log(JSON.stringify({ packaged: out, executable: join(out, "Deskkeep.exe"), version: pkg.version }, null, 2));
