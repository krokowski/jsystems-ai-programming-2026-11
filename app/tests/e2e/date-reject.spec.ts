import { expect, test } from "@playwright/test";
import { waitForFirstMessage } from "./helpers/chat";
import { daysAgo, monthsAgo } from "./helpers/dates";
import { skipWithoutKey } from "./helpers/env";
import { fillCaseForm, PHOTOS, submitCase } from "./helpers/form";

test.describe("deterministic date rejects", () => {
  test("return older than 14 days is rejected (R1.1)", async ({ page }) => {
    skipWithoutKey(test);
    await page.goto("/");
    await fillCaseForm(page, {
      caseType: "Zwrot",
      category: "Smartfon",
      productName: "Galaxy S24",
      purchaseDate: daysAgo(30),
      photo: PHOTOS.phone3,
    });
    await submitCase(page);
    const first = await waitForFirstMessage(page);
    await expect(page.getByTestId("summary-decision")).toContainText("Odrzucono");
    await expect(first).toContainText("R1.1");
  });

  test("complaint older than 24 months is rejected (C1.1)", async ({ page }) => {
    skipWithoutKey(test);
    await page.goto("/");
    await fillCaseForm(page, {
      caseType: "Reklamacja",
      category: "Laptop",
      productName: "ThinkPad X1",
      purchaseDate: monthsAgo(25),
      reason: "Zawias się poluzował i ekran się chwieje.",
      photo: PHOTOS.laptop2,
    });
    await submitCase(page);
    const first = await waitForFirstMessage(page);
    await expect(page.getByTestId("summary-decision")).toContainText("Odrzucono");
    await expect(first).toContainText("C1.1");
  });
});
