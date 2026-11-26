import { expect, test, type Page } from "@playwright/test";
import { waitForFirstMessage } from "./helpers/chat";
import { daysAgo } from "./helpers/dates";
import { skipWithoutKey } from "./helpers/env";
import { fillCaseForm, PHOTOS, submitCase } from "./helpers/form";

async function expectNoHScroll(page: Page): Promise<void> {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(ok).toBe(true);
}

test.describe("mobile 360x800 @mobile", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("return flow without horizontal scroll, summary collapsed", async ({ page }) => {
    test.fixme(true, "pending T54: UI not implemented");
    skipWithoutKey(test);
    await page.goto("/");
    await expectNoHScroll(page);
    await fillCaseForm(page, {
      caseType: "Zwrot",
      category: "Smartfon",
      productName: "Galaxy S24",
      purchaseDate: daysAgo(3),
      photo: PHOTOS.phone1,
    });
    await submitCase(page);
    await expect(page.getByText("Analizuję zdjęcie")).toBeVisible();
    await expectNoHScroll(page);
    await waitForFirstMessage(page);
    await expectNoHScroll(page);
    const toggle = page.getByRole("button", { name: "Pokaż szczegóły zgłoszenia" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("button", { name: "Ukryj szczegóły zgłoszenia" })).toBeVisible();
  });
});
