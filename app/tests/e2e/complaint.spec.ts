import { expect, test } from "@playwright/test";
import { DECISION_LABELS, waitForFirstMessage } from "./helpers/chat";
import { monthsAgo } from "./helpers/dates";
import { skipWithoutKey } from "./helpers/env";
import { fillCaseForm, PHOTOS, submitCase } from "./helpers/form";

test.describe("complaint", () => {
  test("complaint with a mislabeled image file gets a decision", async ({ page }) => {
    skipWithoutKey(test);
    await page.goto("/");
    await fillCaseForm(page, {
      caseType: "Reklamacja",
      category: "Laptop",
      productName: "ThinkPad X1",
      purchaseDate: monthsAgo(14),
      reason: "Zawias pękł podczas zwykłego otwierania laptopa.",
      photo: PHOTOS.laptop1,
    });
    await submitCase(page);
    const first = await waitForFirstMessage(page);
    await expect(first).toContainText(DECISION_LABELS);
    await expect(first).toContainText(/C\d\.\d/);
  });
});
