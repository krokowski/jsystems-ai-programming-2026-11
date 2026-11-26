import { z } from "zod";
import { caseTypeSchema, categorySchema, decisionSchema } from "./enums";

export const API_ERROR_CODES = [
  "PAYLOAD_TOO_LARGE",
  "VALIDATION_FAILED",
  "INTERNAL",
  "CASE_NOT_FOUND",
  "CASE_STATE",
  "AI_UNAVAILABLE",
  "AI_TIMEOUT",
] as const;

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export const caseSummarySchema = z.object({
  caseType: caseTypeSchema,
  category: categorySchema,
  productName: z.string(),
  purchaseDate: z.string(),
  thumbnailDataUrl: z.string(),
  decision: decisionSchema.nullable(),
  decisionLabel: z.string().nullable(),
});

export const createCaseResponseSchema = z.object({
  caseId: z.uuid(),
  summary: caseSummarySchema,
});

export const analysisResponseSchema = z.object({
  status: z.literal("analyzed"),
  findingsSource: z.enum(["screening", "llm"]),
  photoUsable: z.boolean(),
});

export const decisionResponseSchema = z.object({
  status: z.literal("decided"),
  decision: decisionSchema,
  decisionLabel: z.string(),
  citedRules: z.array(z.string()),
  firstMessage: z.unknown(),
});

export const chatRequestSchema = z.object({
  message: z.looseObject({
    id: z.string(),
    role: z.literal("user"),
    parts: z.array(z.object({ type: z.literal("text"), text: z.string() })).min(1),
  }),
  trigger: z.enum(["submit-message", "regenerate-message"]),
});

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
export type CaseSummary = z.infer<typeof caseSummarySchema>;
export type CreateCaseResponse = z.infer<typeof createCaseResponseSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type DecisionResponse = z.infer<typeof decisionResponseSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
