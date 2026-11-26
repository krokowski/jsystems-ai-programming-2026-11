import { expect, test } from "@playwright/test";
import { waitForFirstMessage } from "./helpers/chat";
import { daysAgo } from "./helpers/dates";
import { skipWithoutKey } from "./helpers/env";
import { fillCaseForm, PHOTOS, submitCase } from "./helpers/form";

const DIALOG_TEXT = "Rozpocząć nowe zgłoszenie? Bieżąca rozmowa zostanie utracona.";

async function reachChat(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await fillCaseForm(page, {
    caseType: "Zwrot",
    category: "Smartfon",
    productName: "Galaxy S24",
    purchaseDate: daysAgo(3),
    photo: PHOTOS.phone1,
  });
  await submitCase(page);
  await waitForFirstMessage(page);
}

test.describe("new case and reload", () => {
  test("new case dialog cancels and confirms", async ({ page }) => {
    test.fixme(true, "pending T54: UI not implemented");
    skipWithoutKey(test);
    await reachChat(page);
    await page.getByRole("button", { name: "Nowe zgłoszenie" }).click();
    await expect(page.getByText(DIALOG_TEXT)).toBeVisible();
    await page.getByRole("button", { name: "Anuluj" }).click();
    await expect(page.getByText(DIALOG_TEXT)).toBeHidden();
    await expect(page.getByLabel("Odpowiedź asystenta").first()).toBeVisible();

    await page.getByRole("button", { name: "Nowe zgłoszenie" }).click();
    await page.getByRole("button", { name: "Rozpocznij nowe" }).click();
    await expect(page.getByRole("radio", { name: "Zwrot" })).not.toBeChecked();
    await expect(page.getByRole("radio", { name: "Reklamacja" })).not.toBeChecked();
  });

  test("reload on chat returns to an empty form (AC-32)", async ({ page }) => {
    test.fixme(true, "pending T54: UI not implemented");
    skipWithoutKey(test);
    await reachChat(page);
    await page.reload();
    await expect(page.getByRole("radio", { name: "Zwrot" })).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Wyślij zgłoszenie" })).toBeVisible();
  });
});
