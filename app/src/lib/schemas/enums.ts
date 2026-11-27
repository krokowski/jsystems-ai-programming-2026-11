import { z } from "zod";

export const CASE_TYPES = ["return", "complaint"] as const;
export const CATEGORIES = [
  "smartphone",
  "laptop",
  "tablet",
  "desktop",
  "monitor",
  "tv",
  "audio",
  "wearable",
  "other",
] as const;
export const DECISIONS = ["approve", "reject", "manual_review"] as const;
export const FORCED_BY = ["date_rule", "unusable_photo", "category_mismatch"] as const;
export const DECISION_ORIGINS = ["initial", "chat_update"] as const;
export const DAMAGE_TYPES = [
  "screen_crack",
  "housing_crack_or_dent",
  "scratches",
  "liquid_marks",
  "burn_or_melt",
  "battery_swelling",
  "broken_part",
  "none_visible",
  "other",
] as const;
export const DAMAGE_CAUSES = [
  "manufacturing_defect",
  "mechanical_impact",
  "liquid",
  "normal_wear",
  "no_visible_damage",
  "undetermined",
] as const;
export const USABILITY_ISSUES = ["blurry", "too_dark", "not_electronics", "product_not_visible"] as const;

export const caseTypeSchema = z.enum(CASE_TYPES);
export const categorySchema = z.enum(CATEGORIES);
export const decisionSchema = z.enum(DECISIONS);
export const forcedBySchema = z.enum(FORCED_BY);
export const decisionOriginSchema = z.enum(DECISION_ORIGINS);
export const damageTypeSchema = z.enum(DAMAGE_TYPES);
export const damageCauseSchema = z.enum(DAMAGE_CAUSES);
export const usabilityIssueSchema = z.enum(USABILITY_ISSUES);

export type CaseType = z.infer<typeof caseTypeSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type ForcedBy = z.infer<typeof forcedBySchema>;
export type DecisionOrigin = z.infer<typeof decisionOriginSchema>;
export type DamageType = z.infer<typeof damageTypeSchema>;
export type DamageCause = z.infer<typeof damageCauseSchema>;
export type UsabilityIssue = z.infer<typeof usabilityIssueSchema>;
