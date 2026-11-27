import type { Page } from "@playwright/test";

export type CaseInput = {
  caseType: "Zwrot" | "Reklamacja";
  category: string;
  productName: string;
  purchaseDate: string;
  reason?: string;
  photo: string;
};

export const PHOTOS = {
  laptop1: "../assets/example-images/laptop-1.png",
  laptop2: "../assets/example-images/laptop-2.webp",
  phone1: "../assets/example-images/phone-1.jpg",
  phone3: "../assets/example-images/phone-3.jpeg",
} as const;

export async function pickDate(page: Page, iso: string): Promise<void> {
  await page.getByRole("button", { name: /Data zakupu/ }).click();
  const day = page.locator(`[data-iso="${iso}"]`);
  for (let i = 0; i < 40 && !(await day.isVisible()); i++) {
    await page.getByRole("button", { name: "Poprzedni miesiąc" }).click();
  }
  await day.click();
}

export async function fillCaseForm(page: Page, input: CaseInput): Promise<void> {
  await page.getByRole("radio", { name: input.caseType }).click();
  await page.getByRole("combobox", { name: "Kategoria sprzętu" }).click();
  await page.getByRole("option", { name: input.category, exact: true }).click();
  await page.getByLabel("Nazwa produktu / model").fill(input.productName);
  await pickDate(page, input.purchaseDate);
  if (input.reason !== undefined) {
    await page.getByLabel(/^Powód/).fill(input.reason);
  }
  await page.getByLabel("Zdjęcie produktu").setInputFiles(input.photo);
}

export async function submitCase(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
}
