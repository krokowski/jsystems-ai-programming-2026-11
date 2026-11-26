import { expect, test } from "@playwright/test";
import { DECISION_LABELS, waitForFirstMessage } from "./helpers/chat";
import { dateVariants, daysAgo } from "./helpers/dates";
import { skipWithoutKey } from "./helpers/env";
import { fillCaseForm, PHOTOS, submitCase } from "./helpers/form";

test.describe("return happy path @cross-browser", () => {
  test("return gets a decision and answers a follow-up", async ({ page }) => {
    skipWithoutKey(test);
    const purchaseDate = daysAgo(3);
    await page.goto("/");
    await fillCaseForm(page, {
      caseType: "Zwrot",
      category: "Smartfon",
      productName: "Galaxy S24",
      purchaseDate,
      photo: PHOTOS.phone1,
    });
    await submitCase(page);

    await expect(page.getByText("Analizuję zdjęcie")).toBeVisible();
    await expect(page.getByText("Przygotowuję decyzję")).toBeVisible();

    const first = await waitForFirstMessage(page);
    await expect(first).toContainText(DECISION_LABELS);
    await expect(first).toContainText(/R\d\.\d/);
    // On narrow viewports the summary is collapsed behind a toggle (ui-contract).
    const summaryToggle = page.getByRole("button", { name: "Pokaż szczegóły zgłoszenia" });
    if (await summaryToggle.isVisible()) await summaryToggle.click();
    await expect(page.getByText("Smartfon").locator("visible=true").first()).toBeVisible();

    const replies = page.getByLabel("Odpowiedź asystenta");
    const before = await replies.count();
    await page.getByRole("textbox", { name: "Napisz wiadomość" }).fill("Jaka była data zakupu?");
    await page.getByRole("button", { name: "Wyślij", exact: true }).click();
    await expect(replies).toHaveCount(before + 1, { timeout: 90_000 });
    await expect(replies.last()).toContainText(dateVariants(purchaseDate), { timeout: 90_000 });
  });
});
