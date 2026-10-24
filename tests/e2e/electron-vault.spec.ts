import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("real Electron vault persists encrypted records across restart", async () => {
  const userData = mkdtempSync(join(tmpdir(), "deskkeep-electron-e2e-"));
  const args = [".", `--user-data-dir=${userData}`];
  let app = await electron.launch({ args, cwd: process.cwd() });
  try {
    let window = await app.firstWindow();
    await window.getByLabel("Display name").fill("Electron E2E");
    await window.getByLabel("Master password", { exact: true }).fill("electron test password");
    await window.getByLabel("Confirm master password").fill("electron test password");
    await window.getByRole("button", { name: "Create encrypted Deskkeep" }).click();
    await window.getByRole("button", { name: /I saved it/ }).click();
    await window.getByRole("button", { name: "Vault", exact: true }).click();
    await window.getByRole("button", { name: "Add login" }).click();
    await window.getByLabel("Name", { exact: true }).fill("Electron persisted login");
    await window.getByLabel("Username or email").fill("native@example.test");
    await window.getByLabel("Password").fill("native-secret");
    await window.getByRole("button", { name: "Save encrypted" }).click();
    await expect(window.getByText("Electron persisted login", { exact: true })).toBeVisible();
    await app.close();

    app = await electron.launch({ args, cwd: process.cwd() });
    window = await app.firstWindow();
    await expect(window.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await window.getByLabel("Master password", { exact: true }).fill("electron test password");
    await window.getByRole("button", { name: "Unlock Deskkeep" }).click();
    await window.getByRole("button", { name: "Vault", exact: true }).click();
    await expect(window.getByText("Electron persisted login", { exact: true })).toBeVisible();
  } finally {
    await app.close().catch(() => {});
    rmSync(userData, { recursive: true, force: true });
  }
});
