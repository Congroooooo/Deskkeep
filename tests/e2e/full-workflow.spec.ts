import { expect, test } from "@playwright/test";

test("complete local workspace journey uses only created records", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("deskkeep-preview-v2"));
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Set up your private workspace." }),
  ).toBeVisible();
  await page.getByLabel("Display name").fill("E2E User");
  await page.getByLabel("Master password", { exact: true }).fill("correct horse battery staple");
  await page
    .getByLabel("Confirm master password")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create encrypted Deskkeep" }).click();
  await expect(page.getByText("Keep this code somewhere safe.")).toBeVisible();
  await page.getByRole("button", { name: /I saved it/ }).click();
  await expect(page.getByText("0", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("₱0.00", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Folders" }).click();
  await page.getByRole("button", { name: "Add folder" }).click();
  await page.getByLabel("Folder name").fill("Work");
  await page.getByLabel("Type").selectOption("credential");
  await page.getByRole("button", { name: "Save encrypted" }).click();
  await expect(page.getByText("Work", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Vault" }).click();
  await page.getByRole("button", { name: "Add login" }).click();
  await page.getByLabel("Name", { exact: true }).fill("GitLab E2E");
  await page.getByLabel("Username or email").fill("e2e@example.test");
  await page.getByLabel("Password").fill("unique-e2e-secret");
  await page.getByLabel("Website").fill("https://gitlab.example.test");
  await page.getByLabel("Tags").fill("work, test");
  await page.getByLabel("Folder").selectOption({ label: "Work" });
  await page.getByText("Favorite", { exact: true }).click();
  await page.getByRole("button", { name: "Save encrypted" }).click();
  await expect(page.getByText("GitLab E2E", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Notes" }).click();
  await page.getByRole("button", { name: "Add note" }).click();
  await page.getByLabel("Title", { exact: true }).fill("E2E release note");
  await page
    .getByLabel("Note")
    .fill("# Verified\n- Created from the test journey");
  await page.getByLabel("Labels").fill("e2e, release");
  await page.getByRole("button", { name: "Save encrypted" }).click();
  await expect(page.getByRole("heading", { name: "E2E release note" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();

  await page.getByRole("button", { name: "Tasks" }).click();
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Ship E2E verification");
  await page.getByLabel("Description").fill("Validate every connected module.");
  await page.getByLabel("Priority").selectOption("High");
  await page.getByRole("button", { name: "Save encrypted" }).click();
  await expect(
    page.getByText("Ship E2E verification", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Income" }).click();
  await page.getByRole("button", { name: "Add income" }).click();
  await page.getByLabel("Source").fill("E2E client payment");
  await page.getByLabel("Amount").fill("1234.56");
  await page.getByLabel("Category").fill("Testing");
  await page.getByRole("button", { name: "Save encrypted" }).click();
  await expect(
    page.getByText("E2E client payment", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("₱1,234.56", { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByText("GitLab E2E", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Ship E2E verification", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("₱1,234.56", { exact: true }).first()).toBeVisible();

  await page.locator(".sidebar").getByRole("button", { name: "Calendar" }).click();
  await expect(
    page.getByText("Ship E2E verification", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Calendar view").selectOption("year");
  await expect(page.getByText("1 tasks", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Favorites" }).click();
  await page.getByRole("button", { name: "Passwords" }).click();
  await expect(page.getByText("GitLab E2E", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Security" }).click();
  await page.getByLabel("Auto-lock").selectOption("15");
  await page.getByLabel("Clipboard clearing").selectOption("60");

  await page.getByRole("button", { name: "Activity log" }).click();
  await expect(
    page.getByText("Credential created", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Income created", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Lock Deskkeep" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Master password", { exact: true }).fill("correct horse battery staple");
  await page.getByRole("button", { name: "Unlock Deskkeep" }).click();
  await expect(
    page.getByRole("heading", { name: "Today in your Deskkeep" }),
  ).toBeVisible();
});
