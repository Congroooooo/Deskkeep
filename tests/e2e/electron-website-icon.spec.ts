import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Needs internet access: it fetches the real site icon for chatgpt.com.
test("real Electron shows a website's own icon on a subscription", async () => {
  const userData = mkdtempSync(join(tmpdir(), "deskkeep-icon-e2e-"));
  const args = [".", `--user-data-dir=${userData}`];
  const app = await electron.launch({ args, cwd: process.cwd() });
  try {
    const window = await app.firstWindow();
    await window.getByLabel("Display name").fill("Icon E2E");
    await window.getByLabel("Master password", { exact: true }).fill("icon test password");
    await window.getByLabel("Confirm master password").fill("icon test password");
    await window.getByRole("button", { name: "Create encrypted Deskkeep" }).click();
    await window.getByRole("button", { name: /I saved it/ }).click();
    await window.getByRole("button", { name: "Subscriptions" }).click();
    await window.getByRole("button", { name: /Add subscriptions/ }).click();
    await window.getByLabel("Name", { exact: true }).fill("ChatGPT");
    await window.getByLabel("Provider").fill("OpenAI");
    await window.getByLabel("Website (for its logo)").fill("https://chatgpt.com");
    await window.getByLabel("Amount per cycle").fill("1100");
    await window.getByRole("button", { name: "Save encrypted" }).click();
    const logo = window.locator(".sub-row .site-dot img");
    await expect(logo).toBeVisible({ timeout: 20000 });
    const loaded = await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    expect(loaded).toBe(true);
  } finally {
    await app.close().catch(() => {});
    rmSync(userData, { recursive: true, force: true });
  }
});
