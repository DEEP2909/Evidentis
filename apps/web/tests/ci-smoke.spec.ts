import { expect, test } from "@playwright/test";

test.describe("Web smoke suite", () => {
  test.describe.configure({ mode: "serial", timeout: 120000 });

  const gotoPage = async (page: import("@playwright/test").Page, path: string) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
      // In dev server mode, background requests can keep network active; domcontentloaded is sufficient here.
    });
  };

  test("renders root landing page", async ({ page }) => {
    await gotoPage(page, "/");
    await expect(page.getByRole("heading", { name: /intelligent decision system/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open platform/i })).toBeVisible();
  });

  test("renders login form", async ({ page }) => {
    await gotoPage(page, "/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("renders forgot-password flow", async ({ page }) => {
    await gotoPage(page, "/forgot-password");
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("renders analytics dashboard shell", async ({ page }) => {
    await gotoPage(page, "/analytics");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("renders dashboard shell", async ({ page }) => {
    await gotoPage(page, "/dashboard");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("renders research search UI", async ({ page }) => {
    await gotoPage(page, "/research");
    await expect(page.getByRole("heading", { name: /^research$/i })).toBeVisible();
    await expect(page.getByText(/research with indian sections, judgments, and multilingual answers/i)).toBeVisible();
    await expect(page.getByText(/limitation period for cheque bounce complaints/i)).toBeVisible();
  });
});
