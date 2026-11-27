import { expect, test } from "@playwright/test";

test.describe("smoke @cross-browser", () => {
  test("home page renders title, logo and Polish lang", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Hardware Service Decision Copilot")).toBeVisible();
    await expect(page.getByRole("img", { name: "Asseco" })).toBeVisible();
    await expect(page.locator('html[lang="pl"]')).toHaveCount(1);
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noOverflow).toBe(true);
  });
});
