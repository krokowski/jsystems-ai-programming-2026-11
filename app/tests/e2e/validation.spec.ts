import { expect, test } from "@playwright/test";
import { daysAhead, todayWarsaw } from "./helpers/dates";
import { submitCase } from "./helpers/form";

test.describe("form validation (no AI)", () => {
  test("empty submit shows errors, focuses first radio, sends nothing", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/api/cases")) posts.push(r.url());
    });
    await page.goto("/");
    await submitCase(page);
    await expect(page.getByText("Wybierz rodzaj zgłoszenia.")).toBeVisible();
    await expect(page.getByText("Wybierz kategorię sprzętu.")).toBeVisible();
    await expect(page.getByText("Nazwa produktu musi mieć od 2 do 100 znaków.")).toBeVisible();
    await expect(page.getByText("Wybierz datę zakupu.")).toBeVisible();
    await expect(page.getByText("Dodaj zdjęcie produktu.")).toBeVisible();
    await expect(page.getByRole("radio", { name: "Zwrot" })).toBeFocused();
    expect(posts).toEqual([]);
  });

  test("non-image file is rejected", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Zdjęcie produktu").setInputFiles("tests/fixtures/files/not-an-image.txt");
    await expect(page.getByText("Dozwolone formaty: JPEG, PNG, WebP")).toBeVisible();
    await expect(page.getByRole("img", { name: "not-an-image.txt" })).toHaveCount(0);
  });

  test("text content with .jpg name is rejected by content check", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Zdjęcie produktu").setInputFiles("tests/fixtures/files/text-named.jpg");
    await expect(page.getByText("Dozwolone formaty: JPEG, PNG, WebP")).toBeVisible();
    await expect(page.getByRole("img", { name: "text-named.jpg" })).toHaveCount(0);
  });

  test("future days are disabled in the calendar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Data zakupu/ }).click();
    const tomorrow = daysAhead(1);
    const today = todayWarsaw();
    const month = (iso: string): string => iso.slice(0, 7);
    if (month(tomorrow) !== month(today)) {
      await page.getByRole("button", { name: "Następny miesiąc" }).click();
    }
    await expect(page.locator(`[data-iso="${tomorrow}"]`)).toBeDisabled();
  });

  test("no case request is produced by invalid input", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/api/cases")) posts.push(r.url());
    });
    await page.goto("/");
    await page.getByLabel("Zdjęcie produktu").setInputFiles("tests/fixtures/files/not-an-image.txt");
    await submitCase(page);
    await expect(page.getByText("Wybierz rodzaj zgłoszenia.")).toBeVisible();
    expect(posts).toEqual([]);
  });
});
