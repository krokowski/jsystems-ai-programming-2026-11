import "server-only";

import type { CaseType, Decision, ForcedBy } from "@/lib/schemas/enums";
import type { DateRuleResult, ImageFindings } from "@/lib/schemas/domain";

/**
 * Deterministic guards around the model's decision (PRD AC-19..AC-22, ADR-002 §3.4 step 2,
 * ADR-005 A3). Pure functions: the caller supplies the rule-ID set and the date rule result.
 */

export interface ForcedOutcome {
  decision: Decision;
  ruleIds: string[];
  forcedBy: ForcedBy;
}

export type CitedRulesCheck = { ok: true } | { ok: false; invalid: string[]; reason: "empty" | "unknown" };

export type ChatUpdateCheck = { ok: true } | { ok: false; why: string };

export interface AppliedDecision {
  decision: Decision;
  citedRules: string[];
  forcedBy: ForcedBy | null;
  modelDecision: Decision;
}

/**
 * Forced outcomes apply in the order fixed by ADR-005 A3:
 * period rule, then unusable photo, then category mismatch.
 */
export function forcedOutcome(input: {
  caseType: CaseType;
  dateRule: DateRuleResult;
  findings: ImageFindings;
}): ForcedOutcome | null {
  const { caseType, dateRule, findings } = input;

  if (!dateRule.withinPeriod) {
    return { decision: "reject", ruleIds: [dateRule.ruleId], forcedBy: "date_rule" };
  }

  const photoRule = caseType === "return" ? "R4.3" : "C4.3";
  if (!findings.photoUsable) {
    return { decision: "manual_review", ruleIds: [photoRule], forcedBy: "unusable_photo" };
  }

  if (!findings.categoryMatch) {
    return { decision: "manual_review", ruleIds: [photoRule], forcedBy: "category_mismatch" };
  }

  return null;
}

/** Exact, case-sensitive match against the policy rule IDs of the case type. */
export function validateCitedRules(
  rules: readonly string[],
  policyRuleIds: ReadonlySet<string>,
): CitedRulesCheck {
  if (rules.length === 0) {
    return { ok: false, invalid: [], reason: "empty" };
  }
  const invalid = rules.filter((rule) => !policyRuleIds.has(rule));
  if (invalid.length > 0) {
    return { ok: false, invalid, reason: "unknown" };
  }
  return { ok: true };
}

/**
 * Combines the model decision with a forced outcome. The forced decision and rules win;
 * the model's rules are kept only when they are known policy IDs and the model agrees with the forced
 * decision (a contradicting model cites only the forced rules); duplicates are removed.
 */
export function applyForcedOutcome(input: {
  forced: ForcedOutcome | null;
  modelDecision: Decision;
  citedRules: readonly string[];
  policyRuleIds: ReadonlySet<string>;
}): AppliedDecision {
  const { forced, modelDecision, citedRules, policyRuleIds } = input;
  const validModelRules = citedRules.filter((rule) => policyRuleIds.has(rule));
  // A model that contradicts the forced decision must not cite rules that argue for its own outcome.
  const contradicts = forced !== null && forced.decision !== modelDecision;
  const merged = contradicts ? [...forced.ruleIds] : [...(forced?.ruleIds ?? []), ...validModelRules];
  return {
    decision: forced?.decision ?? modelDecision,
    citedRules: [...new Set(merged)],
    forcedBy: forced?.forcedBy ?? null,
    modelDecision,
  };
}

/**
 * Checks a decision update proposed in chat. Refusal reasons are written in English
 * because they are returned to the model.
 */
export function allowedChatUpdate(
  input: {
    caseType: CaseType;
    dateRule: DateRuleResult;
    findings: ImageFindings;
    currentDecision: Decision;
    policyRuleIds: ReadonlySet<string>;
    acceptedUpdatesInThisMessage: number;
  },
  update: { decision: Decision; reason: string; citedRules: readonly string[] },
): ChatUpdateCheck {
  if (input.acceptedUpdatesInThisMessage >= 1) {
    return { ok: false, why: "Only one decision update can be accepted per chat message." };
  }

  if (update.reason.trim() === "") {
    return { ok: false, why: "The update needs a non-empty reason." };
  }

  const cited = validateCitedRules(update.citedRules, input.policyRuleIds);
  if (!cited.ok) {
    return {
      ok: false,
      why:
        cited.reason === "empty"
          ? "The update must cite at least one policy rule."
          : `The update cites unknown rule IDs for this case type: ${cited.invalid.join(", ")}.`,
    };
  }

  if (update.decision === input.currentDecision) {
    return { ok: false, why: `The decision is already ${update.decision}; nothing to update.` };
  }

  const forced = forcedOutcome(input);
  if (forced !== null && update.decision !== forced.decision) {
    return {
      ok: false,
      why: `${forced.forcedBy} forces the decision to ${forced.decision} (rules ${forced.ruleIds.join(", ")}).`,
    };
  }

  return { ok: true };
}
