import "server-only";

export const BUDGETS = {
  screeningMs: 20_000,
  analysisMs: 58_000,
  decisionMs: 58_000,
  chatTotalMs: 58_000,
  chatFirstChunkMs: 20_000,
  retryMinRemainingMs: 15_000,
  clientBackstopMs: 62_000,
} as const;

export function remainingMs(startedAt: number, budgetMs: number, now: number = Date.now()): number {
  return Math.max(0, budgetMs - (now - startedAt));
}
