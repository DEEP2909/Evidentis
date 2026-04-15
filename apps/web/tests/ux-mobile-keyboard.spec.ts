import { expect, test } from "@playwright/test";

test.describe("UX mobile and keyboard smoke", () => {
  test.describe.configure({ mode: "serial" });

  const gotoPage = async (page: import("@playwright/test").Page, path: string) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
      // Next.js dev mode can keep background requests active; domcontentloaded is sufficient for these checks.
    });
  };

  test("login supports tab-only keyboard navigation", async ({ page }) => {
    test.setTimeout(90000);

    await gotoPage(page, "/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.locator("#email")).toBeFocused();

    await page.keyboard.press("Tab");
    const forgotPasswordLink = page.getByRole("link", { name: /forgot password/i });
    if (await forgotPasswordLink.evaluate((node) => node === document.activeElement)) {
      await page.keyboard.press("Tab");
    }

    await expect(page.locator("#password")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /show password/i })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeFocused();
  });

  test("global command palette opens and closes from keyboard", async ({ page }) => {
    test.setTimeout(90000);

    await gotoPage(page, "/login");

    await page.locator("body").click();
    await page.locator("body").press("ControlOrMeta+K");
    await expect(page.getByText("Command Palette")).toBeVisible();
    await expect(page.getByRole("textbox", { name: /command palette search input/i })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Command Palette")).not.toBeVisible();
  });

  test("mobile viewport has no horizontal overflow on core entry pages", async ({ page }) => {
    test.setTimeout(90000);

    await page.setViewportSize({ width: 390, height: 844 });

    await gotoPage(page, "/");
    await expect(page.getByRole("heading", { name: /evidentis/i })).toBeVisible();
    const landingOverflow = await page.evaluate(
      () => {
        const appRoot =
          (document.querySelector("#__next") as HTMLElement | null) ??
          (document.body.firstElementChild as HTMLElement | null);
        return (appRoot?.scrollWidth ?? document.documentElement.scrollWidth) > window.innerWidth;
      }
    );
    expect(landingOverflow).toBeFalsy();

    await gotoPage(page, "/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    const loginOverflow = await page.evaluate(
      () => {
        const appRoot =
          (document.querySelector("#__next") as HTMLElement | null) ??
          (document.body.firstElementChild as HTMLElement | null);
        return (appRoot?.scrollWidth ?? document.documentElement.scrollWidth) > window.innerWidth;
      }
    );
    expect(loginOverflow).toBeFalsy();
  });
});