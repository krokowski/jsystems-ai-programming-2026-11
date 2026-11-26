import { expect, test } from "@playwright/test";
import { daysAgo } from "./helpers/dates";
import { PHOTOS } from "./helpers/form";

test.describe("keyboard-only form", () => {
  test("every control is reachable and submit gets focus", async ({ page }) => {
    test.fixme(true, "pending T54: UI not implemented");
    await page.goto("/");
    const kb = page.keyboard;

    // Case type: focus the radio group, choose Zwrot with Space.
    await page.getByRole("radio", { name: "Zwrot" }).focus();
    await kb.press("Space");
    await expect(page.getByRole("radio", { name: "Zwrot" })).toBeChecked();
    await kb.press("ArrowRight");
    await kb.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "Zwrot" })).toBeChecked();

    // Category: Tab to combobox, open, choose with arrows + Enter.
    const category = page.getByRole("combobox", { name: "Kategoria sprzętu" });
    await kb.press("Tab");
    await expect(category).toBeFocused();
    await kb.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await kb.press("ArrowDown");
    await kb.press("Enter");
    await expect(page.getByRole("listbox")).toBeHidden();

    // Product name.
    await kb.press("Tab");
    const name = page.getByLabel("Nazwa produktu / model");
    await expect(name).toBeFocused();
    await kb.type("Galaxy S24");

    // Purchase date: open with Enter, click-free selection via keyboard.
    await kb.press("Tab");
    const date = page.getByRole("button", { name: /Data zakupu/ });
    await expect(date).toBeFocused();
    await kb.press("Enter");
    const iso = daysAgo(3);
    await expect(page.locator(`[data-iso="${iso}"]`)).toBeVisible();
    await page.locator(`[data-iso="${iso}"]`).focus();
    await kb.press("Enter");
    await expect(date).toContainText(/\d{2}\.\d{2}\.\d{4}/);

    // Reason.
    await kb.press("Tab");
    const reason = page.getByLabel(/^Powód/);
    await expect(reason).toBeFocused();
    await kb.type("Nie spełnia oczekiwań.");

    // Photo: button reachable by Tab; file chosen via the labelled input.
    await kb.press("Tab");
    await expect(page.getByRole("button", { name: "Wybierz plik" })).toBeFocused();
    await page.getByLabel("Zdjęcie produktu").setInputFiles(PHOTOS.phone1);
    await expect(page.getByRole("button", { name: "Usuń" })).toBeVisible();

    // Submit reachable.
    const submit = page.getByRole("button", { name: "Wyślij zgłoszenie" });
    for (let i = 0; i < 4 && !(await submit.evaluate((el) => el === document.activeElement)); i++) {
      await kb.press("Tab");
    }
    await expect(submit).toBeFocused();
  });
});
