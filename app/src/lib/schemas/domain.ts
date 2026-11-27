import { z } from "zod";
import {
  caseTypeSchema,
  damageCauseSchema,
  damageTypeSchema,
  decisionSchema,
  forcedBySchema,
  usabilityIssueSchema,
} from "./enums";

export const screeningAreaSchema = z.object({
  key: z.string(),
  type: z.enum(["noul", "choice", "score"]),
  value: z.union([z.boolean(), z.string(), z.number()]).nullable(),
  probabilities: z.record(z.string(), z.number()).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  certain: z.boolean(),
  refused: z.boolean(),
});

export const screeningResultSchema = z.object({
  model: z.string(),
  promptVersion: z.string(),
  areas: z.array(screeningAreaSchema),
  allCertain: z.boolean(),
  uncertainKeys: z.array(z.string()),
  costCredits: z.number().nullable(),
  durationMs: z.number(),
  error: z
    .object({
      kind: z.enum(["timeout", "http", "refusal", "parse"]),
      status: z.number().optional(),
    })
    .nullable(),
});

export const imageFindingsSchema = z
  .object({
    source: z.enum(["screening", "llm"]),
    photoUsable: z.boolean(),
    usabilityIssue: usabilityIssueSchema.nullable(),
    categoryMatch: z.boolean(),
    damageVisible: z.boolean(),
    damageType: damageTypeSchema,
    damageLocation: z.string().nullable(),
    likelyCause: damageCauseSchema,
    signsOfUse: z.boolean().nullable(),
    resellable: z.boolean().nullable(),
    conditionScore: z.number().int().min(0).max(4),
    descriptionConsistent: z.boolean().nullable(),
    screeningDisagreements: z.array(z.string()),
    notes: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.photoUsable && v.usabilityIssue === null) {
      ctx.addIssue({ code: "custom", path: ["usabilityIssue"], message: "usabilityIssue required when photoUsable is false" });
    }
  });

export const decisionOutputSchema = z.object({
  decision: decisionSchema,
  citedRules: z.array(z.string()).min(1),
  greeting: z.string().min(1),
  justification: z.string().min(1),
  nextSteps: z.array(z.string()).min(1).max(6),
});

const recordCommon = {
  decision: decisionSchema,
  citedRules: z.array(z.string()).min(1),
  forcedBy: forcedBySchema.nullable(),
  createdAt: z.iso.datetime(),
};

export const decisionRecordSchema = z.discriminatedUnion("origin", [
  z.object({
    origin: z.literal("initial"),
    ...recordCommon,
    greeting: z.string(),
    justification: z.string(),
    nextSteps: z.array(z.string()),
    modelDecision: decisionSchema,
  }),
  z.object({
    origin: z.literal("chat_update"),
    ...recordCommon,
    reason: z.string().min(1),
  }),
]);

export const dateRuleResultSchema = z.object({
  caseType: caseTypeSchema,
  purchaseDate: z.string(),
  referenceDate: z.string(),
  daysSincePurchase: z.number().int().min(0),
  withinPeriod: z.boolean(),
  ruleId: z.enum(["R1.1", "C1.1"]),
  deadline: z.string().nullable(),
  withinCosmeticWindow: z.boolean().nullable(),
});

export type ScreeningArea = z.infer<typeof screeningAreaSchema>;
export type ScreeningResult = z.infer<typeof screeningResultSchema>;
export type ImageFindings = z.infer<typeof imageFindingsSchema>;
export type DecisionOutput = z.infer<typeof decisionOutputSchema>;
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;
export type DateRuleResult = z.infer<typeof dateRuleResultSchema>;
