import "server-only";

import { describe, expect, it } from "vitest";

import { BUDGETS, remainingMs } from "./budgets";

describe("BUDGETS", () => {
  it("holds the ADR-002 timing budgets", () => {
    expect(BUDGETS).toEqual({
      screeningMs: 20_000,
      analysisMs: 58_000,
      decisionMs: 58_000,
      chatTotalMs: 58_000,
      chatFirstChunkMs: 20_000,
      retryMinRemainingMs: 15_000,
      clientBackstopMs: 62_000,
    });
  });
});

describe("remainingMs", () => {
  it("returns the time left in the budget", () => {
    expect(remainingMs(1_000, 20_000, 6_000)).toBe(15_000);
  });

  it("never returns a negative value", () => {
    expect(remainingMs(1_000, 20_000, 100_000)).toBe(0);
  });

  it("uses the current time by default", () => {
    const left = remainingMs(Date.now(), 5_000);
    expect(left).toBeGreaterThan(4_000);
    expect(left).toBeLessThanOrEqual(5_000);
  });
});
