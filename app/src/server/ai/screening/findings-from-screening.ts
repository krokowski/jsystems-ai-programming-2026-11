import "server-only";

import { z } from "zod";

import { damageCauseSchema, damageTypeSchema, type CaseType } from "@/lib/schemas/enums";
import type { ImageFindings, ScreeningResult } from "@/lib/schemas/domain";

import { decideEscalation, findScreeningArea, requiredScreeningKeys } from "./escalation";

const booleanValue = z.boolean();
const scoreValue = z.number().int().min(0).max(4);

function describeArea(screening: ScreeningResult, key: string): string {
  const area = findScreeningArea(screening, key);
  if (area === undefined || area.value === null) {
    return `${key}=unknown`;
  }
  const confidence = area.confidence === null ? "n/a" : area.confidence.toFixed(2);
  return `${key}=${String(area.value)} (${confidence})`;
}

/**
 * Builds ImageFindings for the fast path (ADR-002 §3.3 as amended by ADR-005 A4):
 * no vision call, every required screening area certain, photo usable, and no
 * complaint with visible damage. Throws when the escalation table would escalate.
 */
export function findingsFromScreening(caseType: CaseType, screening: ScreeningResult): ImageFindings {
  const decision = decideEscalation({ caseType, mode: "auto", screening });
  if (decision.action !== "skip") {
    throw new Error(`findingsFromScreening requires a fast-path screening, got escalation: ${decision.reason}`);
  }

  const value = (key: string): unknown => findScreeningArea(screening, key)?.value;
  const notes = `Screening only (no LLM vision): ${requiredScreeningKeys(caseType)
    .map((key) => describeArea(screening, key))
    .join(", ")}.`;
  const conditionScore = scoreValue.parse(value("condition"));
  const categoryMatch = booleanValue.parse(value("category_match"));
  const damageVisible = booleanValue.parse(value("damage_visible"));

  if (caseType === "return") {
    const signsOfUse = booleanValue.parse(value("signs_of_use"));
    return {
      source: "screening",
      photoUsable: true,
      usabilityIssue: null,
      categoryMatch,
      damageVisible,
      damageType: damageVisible ? "other" : "none_visible",
      damageLocation: null,
      likelyCause: damageVisible ? "undetermined" : "no_visible_damage",
      signsOfUse,
      resellable: !damageVisible && !signsOfUse && conditionScore <= 1,
      conditionScore,
      descriptionConsistent: null,
      screeningDisagreements: [],
      notes,
    };
  }

  return {
    source: "screening",
    photoUsable: true,
    usabilityIssue: null,
    categoryMatch,
    damageVisible,
    damageType: damageTypeSchema.parse(value("damage_type")),
    damageLocation: null,
    likelyCause: damageCauseSchema.parse(value("damage_cause")),
    signsOfUse: null,
    resellable: null,
    conditionScore,
    descriptionConsistent: booleanValue.parse(value("description_consistent")),
    screeningDisagreements: [],
    notes,
  };
}
