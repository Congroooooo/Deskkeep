import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const executable = resolve('release', 'Deskkeep-win32-x64', 'Deskkeep.exe');
const userData = mkdtempSync(join(tmpdir(), 'deskkeep-packaged-'));
const output = resolve('test-results', 'packaged-check.json');
mkdirSync(dirname(output), { recursive: true });

let child;
let launched = false;
let launchError = null;
try {
  child = spawn(executable, [`--user-data-dir=${userData}`], { stdio: 'ignore' });
  launchError = await new Promise((resolveError) => {
    child.once('error', (error) => resolveError(error.message));
    setTimeout(() => resolveError(null), 5000);
  });
  launched = !launchError && child.exitCode === null;
  if (launched) child.kill();
  await new Promise((resolveWait) => {
    if (!child || child.exitCode !== null) return resolveWait();
    child.once('exit', resolveWait);
    setTimeout(resolveWait, 3000).unref();
  });
} catch (error) {
  launchError = error instanceof Error ? error.message : String(error);
}

const result = {
  checkedAt: new Date().toISOString(),
  executable,
  isolatedUserData: true,
  remainedOpenForFiveSeconds: launched,
  result: launched ? 'passed' : 'blocked',
  exitCode: child?.exitCode ?? null,
  launchError
};
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
rmSync(userData, { recursive: true, force: true });
console.log(JSON.stringify(result, null, 2));
if (!launched) process.exitCode = 2;
