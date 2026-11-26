import { describe, expect, it } from "vitest";

import { dateRuleResultSchema } from "@/lib/schemas";

import { computeDateRule } from "./date-rules";

function rule(caseType: "return" | "complaint", purchaseDate: string, referenceDate: string) {
  const result = computeDateRule({ caseType, purchaseDate, referenceDate });
  expect(dateRuleResultSchema.safeParse(result).success).toBe(true);
  return result;
}

describe("computeDateRule: return window (R1.1, 14 calendar days)", () => {
  it("is within the period on day 14", () => {
    const r = rule("return", "2026-11-12", "2026-11-26");
    expect(r.daysSincePurchase).toBe(14);
    expect(r.withinPeriod).toBe(true);
    expect(r.ruleId).toBe("R1.1");
    expect(r.deadline).toBe("2026-11-26");
    expect(r.withinCosmeticWindow).toBeNull();
  });

  it("is out of the period on day 15", () => {
    const r = rule("return", "2026-11-11", "2026-11-26");
    expect(r.daysSincePurchase).toBe(15);
    expect(r.withinPeriod).toBe(false);
  });

  it("counts calendar days across a month boundary (A2): 1 Nov -> 15 Nov is within", () => {
    const r = rule("return", "2026-11-01", "2026-11-15");
    expect(r.daysSincePurchase).toBe(14);
    expect(r.withinPeriod).toBe(true);
  });

  it("counts calendar days across a month boundary (A2): 1 Nov -> 16 Nov is out", () => {
    const r = rule("return", "2026-11-01", "2026-11-16");
    expect(r.daysSincePurchase).toBe(15);
    expect(r.withinPeriod).toBe(false);
  });
});

describe("computeDateRule: complaint period (C1.1, 24 months)", () => {
  it("is within on the exact 24-month anniversary", () => {
    const r = rule("complaint", "2024-11-26", "2026-11-26");
    expect(r.ruleId).toBe("C1.1");
    expect(r.deadline).toBe("2026-11-26");
    expect(r.withinPeriod).toBe(true);
  });

  it("is out one day after the 24-month anniversary", () => {
    const r = rule("complaint", "2024-11-25", "2026-11-26");
    expect(r.withinPeriod).toBe(false);
  });

  it("clamps the deadline to the month end for 29 February purchases", () => {
    const r = rule("complaint", "2024-02-29", "2026-02-28");
    expect(r.deadline).toBe("2026-02-28");
    expect(r.withinPeriod).toBe(true);
  });

  it("is out on 1 March after a 29 February purchase", () => {
    const r = rule("complaint", "2024-02-29", "2026-03-01");
    expect(r.deadline).toBe("2026-02-28");
    expect(r.withinPeriod).toBe(false);
  });
});

describe("computeDateRule: cosmetic window (complaint only)", () => {
  it("is true on complaint day 14", () => {
    const r = rule("complaint", "2026-11-12", "2026-11-26");
    expect(r.daysSincePurchase).toBe(14);
    expect(r.withinCosmeticWindow).toBe(true);
  });

  it("is false on complaint day 15", () => {
    const r = rule("complaint", "2026-11-11", "2026-11-26");
    expect(r.daysSincePurchase).toBe(15);
    expect(r.withinCosmeticWindow).toBe(false);
  });
});

describe("computeDateRule: edge cases", () => {
  it("returns zero days for the same day, for both case types", () => {
    expect(rule("return", "2026-11-26", "2026-11-26").daysSincePurchase).toBe(0);
    expect(rule("complaint", "2026-11-26", "2026-11-26").daysSincePurchase).toBe(0);
  });

  it("throws a plain Error when the purchase date is after the reference date", () => {
    expect(() =>
      computeDateRule({ caseType: "return", purchaseDate: "2026-11-27", referenceDate: "2026-11-26" }),
    ).toThrow(Error);
  });
});
