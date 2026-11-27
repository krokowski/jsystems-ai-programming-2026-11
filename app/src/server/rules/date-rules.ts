import "server-only";

import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { CaseType, DateRuleResult } from "@/lib/schemas";

export interface DateRuleInput {
  caseType: CaseType;
  purchaseDate: string;
  referenceDate: string;
}

const RETURN_WINDOW_DAYS = 14;
const COMPLAINT_PERIOD_MONTHS = 24;
const COSMETIC_WINDOW_DAYS = 14;

/**
 * Deterministic date rules (PRD AC-20/21, ADR-002 section 4.5, ADR-005 A2, A7, A10).
 * ISO dates carry no time zone, so calendar-day arithmetic is exact.
 */
export function computeDateRule(input: DateRuleInput): DateRuleResult {
  const { caseType, purchaseDate, referenceDate } = input;
  if (purchaseDate > referenceDate) {
    throw new Error("purchaseDate must not be after referenceDate");
  }

  const purchase = parseISO(purchaseDate);
  const reference = parseISO(referenceDate);
  const daysSincePurchase = differenceInCalendarDays(reference, purchase);

  if (caseType === "return") {
    const deadline = addDays(purchase, RETURN_WINDOW_DAYS);
    return {
      caseType,
      purchaseDate,
      referenceDate,
      daysSincePurchase,
      withinPeriod: daysSincePurchase <= RETURN_WINDOW_DAYS,
      ruleId: "R1.1",
      deadline: format(deadline, "yyyy-MM-dd"),
      withinCosmeticWindow: null,
    };
  }

  const deadline = addMonths(purchase, COMPLAINT_PERIOD_MONTHS);
  return {
    caseType,
    purchaseDate,
    referenceDate,
    daysSincePurchase,
    withinPeriod: differenceInCalendarDays(reference, deadline) <= 0,
    ruleId: "C1.1",
    deadline: format(deadline, "yyyy-MM-dd"),
    withinCosmeticWindow: daysSincePurchase <= COSMETIC_WINDOW_DAYS,
  };
}
