import { expect, type Locator, type Page } from "@playwright/test";

export const DISCLAIMER =
  "To jest wstępna decyzja. Ostateczna decyzja zostanie podjęta po oględzinach produktu przez nasz serwis.";

export const DECISION_LABELS = /Zaakceptowano|Odrzucono|Do weryfikacji przez pracownika/;

export async function waitForFirstMessage(page: Page): Promise<Locator> {
  const first = page.getByLabel("Odpowiedź asystenta").first();
  await expect(first).toContainText(DISCLAIMER, { timeout: 150_000 });
  return first;
}
