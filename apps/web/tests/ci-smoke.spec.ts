import { expect, test } from "@playwright/test";

test.describe("Web smoke suite", () => {
  test("renders root landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "EvidentIS" })).toBeVisible();
    await expect(page.getByRole("link", { name: /open platform/i })).toBeVisible();
  });

  test("renders login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("renders forgot-password flow", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("renders analytics dashboard shell", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: /firm analytics/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /30 days/i })).toBeVisible();
  });

  test("renders research search UI", async ({ page }) => {
    await page.goto("/research");
    await expect(page.getByRole("heading", { name: /^research$/i })).toBeVisible();
    await expect(page.getByText(/research with indian sections, judgments, and multilingual answers/i)).toBeVisible();
    await expect(page.getByText(/limitation period for cheque bounce complaints/i)).toBeVisible();
  });

  test("renders dashboard shell", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /nyay assist/i })).toBeVisible();
  });
});
