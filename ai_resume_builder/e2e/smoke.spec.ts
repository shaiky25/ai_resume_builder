import { test, expect } from "@playwright/test";

// Deliberately does not send a chat message or trigger an export: this is a
// smoke test that the app boots and renders, not a functional test of the
// mocked chat/export flows (those are covered by unit tests with fakes).
test("resume builder UI renders chat and preview controls", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByPlaceholder("Message your career coach…")
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Resume Preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export DOCX" })).toBeVisible();
});
