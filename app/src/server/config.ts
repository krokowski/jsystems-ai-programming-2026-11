import "server-only";

import { resolve } from "node:path";

import { z } from "zod";

export type AnalysisEscalation = "auto" | "always";

export interface AppConfig {
  openRouterApiKey: string;
  llmModel: string;
  visionModel: string;
  decisionsModel: string;
  screeningConfidenceThreshold: number;
  analysisEscalation: AnalysisEscalation;
  policyDir: string;
  caseTtlMinutes: number;
}

export class ConfigError extends Error {}

const DEFAULT_DECISIONS_MODEL = "openai/gpt-6-luna-decisions";
const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_POLICY_DIR = "../docs/policies";
const DEFAULT_CASE_TTL_MINUTES = 120;

// Empty strings count as missing (ADR-005 config rules).
function readVar(env: Record<string, string | undefined>, name: string): string | undefined {
  const raw = env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

const numberField = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value): number => (value === undefined ? fallback : Number(value)));

const RawEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string(),
  LLM_MODEL: z.string(),
  VISION_MODEL: z.string().optional(),
  DECISIONS_MODEL: z.string().default(DEFAULT_DECISIONS_MODEL),
  SCREENING_CONFIDENCE_THRESHOLD: numberField(DEFAULT_THRESHOLD).pipe(
    z.number().min(0).max(1),
  ),
  ANALYSIS_ESCALATION: z.enum(["auto", "always"]).default("auto"),
  POLICY_DIR: z.string().default(DEFAULT_POLICY_DIR),
  CASE_TTL_MINUTES: numberField(DEFAULT_CASE_TTL_MINUTES).pipe(
    z.number().int().positive(),
  ),
});

export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = RawEnvSchema.safeParse({
    OPENROUTER_API_KEY: readVar(env, "OPENROUTER_API_KEY"),
    LLM_MODEL: readVar(env, "LLM_MODEL"),
    VISION_MODEL: readVar(env, "VISION_MODEL"),
    DECISIONS_MODEL: readVar(env, "DECISIONS_MODEL"),
    SCREENING_CONFIDENCE_THRESHOLD: readVar(env, "SCREENING_CONFIDENCE_THRESHOLD"),
    ANALYSIS_ESCALATION: readVar(env, "ANALYSIS_ESCALATION"),
    POLICY_DIR: readVar(env, "POLICY_DIR"),
    CASE_TTL_MINUTES: readVar(env, "CASE_TTL_MINUTES"),
  });

  if (!parsed.success) {
    // Report variable names only; never echo values (they may hold secrets).
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new ConfigError(
      `Missing or invalid environment variable(s): ${names.join(", ")}`,
    );
  }

  const data = parsed.data;
  return {
    openRouterApiKey: data.OPENROUTER_API_KEY,
    llmModel: data.LLM_MODEL,
    visionModel: data.VISION_MODEL ?? data.LLM_MODEL,
    decisionsModel: data.DECISIONS_MODEL,
    screeningConfidenceThreshold: data.SCREENING_CONFIDENCE_THRESHOLD,
    analysisEscalation: data.ANALYSIS_ESCALATION,
    // Policies live outside app/ (../docs/policies); they are read at runtime, not bundled.
    policyDir: resolve(/*turbopackIgnore: true*/ process.cwd(), data.POLICY_DIR),
    caseTtlMinutes: data.CASE_TTL_MINUTES,
  };
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached === undefined) {
    cached = parseConfig(process.env);
  }
  return cached;
}

export function resetConfigForTests(): void {
  cached = undefined;
}
