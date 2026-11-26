import type { UIMessage } from "ai";
import { z } from "zod";
import { decisionOriginSchema, decisionSchema } from "./enums";

export const decisionDataSchema = z.object({
  decision: decisionSchema,
  label: z.string(),
  origin: decisionOriginSchema,
  reason: z.string().optional(),
});

export const messageMetadataSchema = z.object({
  decision: decisionSchema.optional(),
  origin: decisionOriginSchema.optional(),
  citedRules: z.array(z.string()).optional(),
});

export type DecisionData = z.infer<typeof decisionDataSchema>;
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type AppDataParts = { decision: DecisionData };
export type AppUIMessage = UIMessage<MessageMetadata, AppDataParts>;

export const dataPartSchemas = { decision: decisionDataSchema };
