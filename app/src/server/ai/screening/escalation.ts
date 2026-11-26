import "server-only";

import type { CaseType } from "@/lib/schemas/enums";
import type { ScreeningArea, ScreeningResult } from "@/lib/schemas/domain";

export type EscalationMode = "auto" | "always";
export type EscalationReason =
  | "always"
  | "screening_error"
  | "uncertain"
  | "photo_unusable"
  | "complaint_damage"
  | "all_certain";

export interface EscalationDecision {
  action: "skip" | "escalate";
  withSignals: boolean;
  uncertainKeys: string[];
  reason: EscalationReason;
}

const RETURN_KEYS = ["photo_usable", "category_match", "damage_visible", "signs_of_use", "condition"] as const;
const COMPLAINT_KEYS = [
  "photo_usable",
  "category_match",
  "damage_visible",
  "damage_type",
  "damage_cause",
  "description_consistent",
  "condition",
] as const;

export function requiredScreeningKeys(caseType: CaseType): readonly string[] {
  return caseType === "return" ? RETURN_KEYS : COMPLAINT_KEYS;
}

export function findScreeningArea(screening: ScreeningResult, key: string): ScreeningArea | undefined {
  return screening.areas.find((area) => area.key === key);
}

/** An area is usable only when it is certain, not refused and carries a value. */
function isUsableArea(area: ScreeningArea | undefined): area is ScreeningArea {
  return area !== undefined && area.certain && !area.refused && area.value !== null;
}

/** Required keys whose area is missing, refused, uncertain or has no value. */
function uncertainRequiredKeys(caseType: CaseType, screening: ScreeningResult): string[] {
  return requiredScreeningKeys(caseType).filter((key) => !isUsableArea(findScreeningArea(screening, key)));
}

export function decideEscalation(input: {
  caseType: CaseType;
  mode: EscalationMode;
  screening: ScreeningResult;
}): EscalationDecision {
  const { caseType, mode, screening } = input;

  if (mode === "always") {
    return { action: "escalate", withSignals: true, uncertainKeys: [...screening.uncertainKeys], reason: "always" };
  }

  if (screening.error !== null) {
    return { action: "escalate", withSignals: false, uncertainKeys: [], reason: "screening_error" };
  }

  const uncertainKeys = uncertainRequiredKeys(caseType, screening);
  if (uncertainKeys.length > 0) {
    return { action: "escalate", withSignals: true, uncertainKeys, reason: "uncertain" };
  }

  if (findScreeningArea(screening, "photo_usable")?.value === false) {
    return { action: "escalate", withSignals: true, uncertainKeys: [], reason: "photo_unusable" };
  }

  if (caseType === "complaint" && findScreeningArea(screening, "damage_visible")?.value === true) {
    return { action: "escalate", withSignals: true, uncertainKeys: [], reason: "complaint_damage" };
  }

  return { action: "skip", withSignals: false, uncertainKeys: [], reason: "all_certain" };
}
