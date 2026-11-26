import "server-only";

import { describe, expect, it } from "vitest";

import type { DateRuleResult, ImageFindings } from "@/lib/schemas/domain";

import {
  allowedChatUpdate,
  applyForcedOutcome,
  forcedOutcome,
  validateCitedRules,
} from "./guards";

const RETURN_IDS: ReadonlySet<string> = new Set(["R1.1", "R2.1", "R4.3"]);
const COMPLAINT_IDS: ReadonlySet<string> = new Set(["C1.1", "C2.1", "C4.3"]);

function dateRule(caseType: "return" | "complaint", withinPeriod: boolean): DateRuleResult {
  return {
    caseType,
    purchaseDate: "2026-01-10",
    referenceDate: "2026-11-26",
    daysSincePurchase: withinPeriod ? 100 : 400,
    withinPeriod,
    ruleId: caseType === "return" ? "R1.1" : "C1.1",
    deadline: "2026-12-10",
    withinCosmeticWindow: null,
  };
}

function findings(overrides: Partial<ImageFindings> = {}): ImageFindings {
  return {
    source: "llm",
    photoUsable: true,
    usabilityIssue: null,
    categoryMatch: true,
    damageVisible: false,
    damageType: "none_visible",
    damageLocation: null,
    likelyCause: "no_visible_damage",
    signsOfUse: false,
    resellable: true,
    conditionScore: 1,
    descriptionConsistent: null,
    screeningDisagreements: [],
    notes: "test",
    ...overrides,
  };
}

const UNUSABLE = findings({ photoUsable: false, usabilityIssue: "blurry" });
const MISMATCH = findings({ categoryMatch: false });

describe("forcedOutcome", () => {
  it("forces reject with R1.1 when a return is out of period", () => {
    expect(
      forcedOutcome({ caseType: "return", dateRule: dateRule("return", false), findings: findings() }),
    ).toEqual({ decision: "reject", ruleIds: ["R1.1"], forcedBy: "date_rule" });
  });

  it("forces reject with C1.1 when a complaint is out of period", () => {
    expect(
      forcedOutcome({ caseType: "complaint", dateRule: dateRule("complaint", false), findings: findings() }),
    ).toEqual({ decision: "reject", ruleIds: ["C1.1"], forcedBy: "date_rule" });
  });

  it("forces manual_review with R4.3 for an unusable return photo", () => {
    expect(
      forcedOutcome({ caseType: "return", dateRule: dateRule("return", true), findings: UNUSABLE }),
    ).toEqual({ decision: "manual_review", ruleIds: ["R4.3"], forcedBy: "unusable_photo" });
  });

  it("forces manual_review with C4.3 for an unusable complaint photo", () => {
    expect(
      forcedOutcome({ caseType: "complaint", dateRule: dateRule("complaint", true), findings: UNUSABLE }),
    ).toEqual({ decision: "manual_review", ruleIds: ["C4.3"], forcedBy: "unusable_photo" });
  });

  it("forces manual_review with R4.3 for a category mismatch on a return", () => {
    expect(
      forcedOutcome({ caseType: "return", dateRule: dateRule("return", true), findings: MISMATCH }),
    ).toEqual({ decision: "manual_review", ruleIds: ["R4.3"], forcedBy: "category_mismatch" });
  });

  it("forces manual_review with C4.3 for a category mismatch on a complaint", () => {
    expect(
      forcedOutcome({ caseType: "complaint", dateRule: dateRule("complaint", true), findings: MISMATCH }),
    ).toEqual({ decision: "manual_review", ruleIds: ["C4.3"], forcedBy: "category_mismatch" });
  });

  it("returns null when no forced condition applies", () => {
    expect(
      forcedOutcome({ caseType: "return", dateRule: dateRule("return", true), findings: findings() }),
    ).toBeNull();
  });

  it("lets the date rule win over an unusable photo", () => {
    expect(
      forcedOutcome({ caseType: "return", dateRule: dateRule("return", false), findings: UNUSABLE }),
    ).toEqual({ decision: "reject", ruleIds: ["R1.1"], forcedBy: "date_rule" });
  });

  it("lets the date rule win over a category mismatch", () => {
    expect(
      forcedOutcome({ caseType: "complaint", dateRule: dateRule("complaint", false), findings: MISMATCH }),
    ).toEqual({ decision: "reject", ruleIds: ["C1.1"], forcedBy: "date_rule" });
  });

  it("lets the unusable photo win over a category mismatch", () => {
    const both = findings({ photoUsable: false, usabilityIssue: "too_dark", categoryMatch: false });
    expect(
      forcedOutcome({ caseType: "return", dateRule: dateRule("return", true), findings: both }),
    ).toEqual({ decision: "manual_review", ruleIds: ["R4.3"], forcedBy: "unusable_photo" });
  });
});

describe("validateCitedRules", () => {
  it("rejects an empty list", () => {
    expect(validateCitedRules([], RETURN_IDS)).toEqual({ ok: false, invalid: [], reason: "empty" });
  });

  it("rejects an unknown rule ID", () => {
    expect(validateCitedRules(["R9.9"], RETURN_IDS)).toEqual({ ok: false, invalid: ["R9.9"], reason: "unknown" });
  });

  it("rejects a complaint rule ID on a return rule set", () => {
    expect(validateCitedRules(["C2.1"], RETURN_IDS)).toEqual({ ok: false, invalid: ["C2.1"], reason: "unknown" });
  });

  it("rejects a lower-case rule ID because matching is case-sensitive", () => {
    expect(validateCitedRules(["r1.1"], RETURN_IDS)).toEqual({ ok: false, invalid: ["r1.1"], reason: "unknown" });
  });

  it("accepts known return rule IDs", () => {
    expect(validateCitedRules(["R1.1", "R2.1"], RETURN_IDS)).toEqual({ ok: true });
  });
});

describe("applyForcedOutcome", () => {
  it("overrides the model approve with the forced reject and puts forced rules first", () => {
    const forced = forcedOutcome({
      caseType: "return",
      dateRule: dateRule("return", false),
      findings: findings(),
    });
    expect(
      applyForcedOutcome({
        forced,
        modelDecision: "approve",
        citedRules: ["R2.1"],
        policyRuleIds: RETURN_IDS,
      }),
    ).toEqual({
      decision: "reject",
      citedRules: ["R1.1"],
      forcedBy: "date_rule",
      modelDecision: "approve",
    });
  });

  it("cites only the forced rules when the model decision contradicts the forced one", () => {
    const forced = forcedOutcome({
      caseType: "return",
      dateRule: dateRule("return", false),
      findings: findings(),
    });
    expect(
      applyForcedOutcome({
        forced,
        modelDecision: "approve",
        citedRules: ["R4.3", "R2.1"],
        policyRuleIds: RETURN_IDS,
      }).citedRules,
    ).toEqual(["R1.1"]);
  });

  it("when the model agrees with the forced decision keeps forced ids first, then valid model ids", () => {
    const forced = forcedOutcome({
      caseType: "return",
      dateRule: dateRule("return", false),
      findings: findings(),
    });
    expect(
      applyForcedOutcome({
        forced,
        modelDecision: "reject",
        citedRules: ["R1.1", "R9.9", "R2.1"],
        policyRuleIds: RETURN_IDS,
      }).citedRules,
    ).toEqual(["R1.1", "R2.1"]);
  });

  it("keeps the model decision and valid rules when nothing is forced", () => {
    expect(
      applyForcedOutcome({
        forced: null,
        modelDecision: "manual_review",
        citedRules: ["R2.1"],
        policyRuleIds: RETURN_IDS,
      }),
    ).toEqual({
      decision: "manual_review",
      citedRules: ["R2.1"],
      forcedBy: null,
      modelDecision: "manual_review",
    });
  });
});

describe("allowedChatUpdate", () => {
  const complaintInput = {
    caseType: "complaint" as const,
    dateRule: dateRule("complaint", true),
    findings: findings(),
    currentDecision: "manual_review" as const,
    policyRuleIds: COMPLAINT_IDS,
    acceptedUpdatesInThisMessage: 0,
  };

  it("accepts a complaint update from manual_review to approve with C2.1", () => {
    expect(
      allowedChatUpdate(complaintInput, {
        decision: "approve",
        reason: "Customer's photo shows no defect.",
        citedRules: ["C2.1"],
      }),
    ).toEqual({ ok: true });
  });

  it("refuses an update to the same decision", () => {
    const result = allowedChatUpdate(complaintInput, {
      decision: "manual_review",
      reason: "Still unclear.",
      citedRules: ["C2.1"],
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a second accepted update in the same message", () => {
    const result = allowedChatUpdate(
      { ...complaintInput, acceptedUpdatesInThisMessage: 1 },
      { decision: "approve", reason: "Fine.", citedRules: ["C2.1"] },
    );
    expect(result.ok).toBe(false);
  });

  it("refuses an empty cited rule list", () => {
    const result = allowedChatUpdate(complaintInput, { decision: "approve", reason: "Fine.", citedRules: [] });
    expect(result.ok).toBe(false);
  });

  it("refuses an unknown cited rule", () => {
    const result = allowedChatUpdate(complaintInput, { decision: "approve", reason: "Fine.", citedRules: ["C9.9"] });
    expect(result.ok).toBe(false);
  });

  it("refuses a rule ID from the other case type", () => {
    const result = allowedChatUpdate(complaintInput, { decision: "approve", reason: "Fine.", citedRules: ["R1.1"] });
    expect(result.ok).toBe(false);
  });

  it("refuses an empty reason", () => {
    const result = allowedChatUpdate(complaintInput, { decision: "approve", reason: "   ", citedRules: ["C2.1"] });
    expect(result.ok).toBe(false);
  });

  it("refuses any decision other than reject when the date rule failed", () => {
    const result = allowedChatUpdate(
      { ...complaintInput, dateRule: dateRule("complaint", false), currentDecision: "approve" },
      { decision: "manual_review", reason: "Checking.", citedRules: ["C1.1"] },
    );
    expect(result.ok).toBe(false);
  });

  it("refuses approve when the photo is unusable", () => {
    const result = allowedChatUpdate(
      { ...complaintInput, findings: UNUSABLE, currentDecision: "reject" },
      { decision: "approve", reason: "Fine.", citedRules: ["C2.1"] },
    );
    expect(result.ok).toBe(false);
  });

  it("refuses approve when the category does not match", () => {
    const result = allowedChatUpdate(
      { ...complaintInput, findings: MISMATCH, currentDecision: "reject" },
      { decision: "approve", reason: "Fine.", citedRules: ["C2.1"] },
    );
    expect(result.ok).toBe(false);
  });
});
