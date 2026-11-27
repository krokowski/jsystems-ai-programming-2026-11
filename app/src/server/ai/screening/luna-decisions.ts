import "server-only";

// Adapter for the OpenRouter Decisions API. It serves any Decisions-API model; the default is
// Jev 1.14 (`typesafe/jev-1.14`, ADR-005 A23). The file and export names stay from the Luna era.

import { z } from "zod";

import type { ScreeningArea, ScreeningResult } from "@/lib/schemas/domain";
import { BUDGETS } from "@/server/ai/budgets";
import type { ModelRegistry } from "@/server/ai/models";
import type { AppConfig } from "@/server/config";
import { logStage } from "@/server/logging";

import type { ScreeningInput, ScreeningPort } from "./port";
import { buildScreeningQuestions, buildStateText, type ScreeningQuestion } from "./questions";

const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";

// Field names fixed by spike S1 (tests/fixtures/captures/s1-findings.md).
// A23: Jev (like Luna) returns no `confidence` on `noul` answers in the real captures
// (s1-jev-findings.md), though the docs show one; use it when it is a number, else the A22 fallback.
const noulAnswer = z.object({
  type: z.literal("noul"),
  noul: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).nullish(),
});
// A23: Jev returns a fractional expected bucket (3.95); it is rounded to the bucket index below.
const scoreAnswer = z.object({
  type: z.literal("score"),
  score: z.number().min(0),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.string(), z.number()),
});
const choiceAnswer = z.object({
  type: z.literal("choice"),
  choice: z.string(),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.string(), z.number()),
});

const responseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), z.unknown()),
  usage: z
    .object({
      cost: z.number().nullish(),
      cost_details: z.object({ upstream_inference_cost: z.number().nullish() }).nullish(),
    })
    .nullish(),
});

type DecisionsResponse = z.infer<typeof responseSchema>;

export interface LunaDecisionsDeps {
  registry: ModelRegistry;
  config: AppConfig;
  now?: () => number;
  /** Overrides BUDGETS.screeningMs (tests use a short value). */
  timeoutMs?: number;
}

// Rounds away binary float noise (1 - 0.8 = 0.19999999999999996) before comparing to the threshold.
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function refusedArea(key: string, question: ScreeningQuestion): ScreeningArea {
  return { key, type: question.type, value: null, probabilities: null, confidence: null, certain: false, refused: true };
}

function mapArea(key: string, question: ScreeningQuestion, raw: unknown, threshold: number): ScreeningArea {
  if (question.type === "noul") {
    const parsed = noulAnswer.safeParse(raw);
    if (!parsed.success) return refusedArea(key, question);
    const p = parsed.data.noul;
    const confidence = parsed.data.confidence ?? round6(Math.max(p, 1 - p)); // ADR-005 A22/A23
    return {
      key,
      type: "noul",
      value: p >= 0.5,
      probabilities: { true: p, false: round6(1 - p) },
      confidence,
      certain: confidence >= threshold,
      refused: false,
    };
  }
  if (question.type === "score") {
    const parsed = scoreAnswer.safeParse(raw);
    if (!parsed.success) return refusedArea(key, question);
    const bucket = Math.round(parsed.data.score);
    if (bucket >= question.criteria.length) return refusedArea(key, question);
    return {
      key,
      type: "score",
      value: bucket,
      probabilities: parsed.data.probabilities,
      confidence: parsed.data.confidence,
      certain: parsed.data.confidence >= threshold,
      refused: false,
    };
  }
  const parsed = choiceAnswer.safeParse(raw);
  if (!parsed.success || !Object.hasOwn(question.criteria, parsed.data.choice)) {
    return refusedArea(key, question);
  }
  return {
    key,
    type: "choice",
    value: parsed.data.choice,
    probabilities: parsed.data.probabilities,
    confidence: parsed.data.confidence,
    certain: parsed.data.confidence >= threshold,
    refused: false,
  };
}

// BYOK keys report usage.cost = 0; the real price is in cost_details (ADR-005 A22).
function costOf(body: DecisionsResponse): number | null {
  const usage = body.usage;
  if (!usage) return null;
  const cost = usage.cost || usage.cost_details?.upstream_inference_cost;
  return typeof cost === "number" ? cost : null;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === "AbortError" || err.name === "TimeoutError"
    : err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

export function createLunaDecisionsScreening(deps: LunaDecisionsDeps): ScreeningPort {
  const { registry, config } = deps;
  const now = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? BUDGETS.screeningMs;

  async function screen(input: ScreeningInput): Promise<ScreeningResult> {
    const startedAt = now();
    const { questions, version } = buildScreeningQuestions(input.caseType, input.form.category);
    const model = registry.modelId("screening");

    const finish = (result: Omit<ScreeningResult, "durationMs" | "promptVersion">): ScreeningResult => {
      const full: ScreeningResult = { ...result, promptVersion: version, durationMs: Math.max(0, now() - startedAt) };
      const confidences: Record<string, number | null> = {};
      for (const area of full.areas) confidences[area.key] = area.confidence;
      logStage({
        caseId: input.caseId,
        stage: "screening",
        durationMs: full.durationMs,
        model: full.model,
        promptVersion: version,
        confidences,
        costCredits: full.costCredits,
        status: full.error === null ? "ok" : "error",
        errorKind: full.error?.kind ?? null,
      });
      return full;
    };

    const failed = (error: NonNullable<ScreeningResult["error"]>): ScreeningResult =>
      finish({ model, areas: [], allCertain: false, uncertainKeys: [], costCredits: null, error });

    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await registry.fetch(DECISIONS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.openRouterApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          state: [
            buildStateText(input.form),
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.jpeg.toString("base64")}` } },
          ],
          questions,
          session_id: input.caseId,
          // A23: data_collection=deny is routable for Jev (provider TypeSafe), see s1-jev-findings.md.
          provider: { data_collection: "deny" },
        }),
        signal,
      });
    } catch (err) {
      return failed(isAbort(err) || signal.aborted ? { kind: "timeout" } : { kind: "http" });
    }

    if (!response.ok) return failed({ kind: "http", status: response.status });

    let body: DecisionsResponse;
    try {
      body = responseSchema.parse(await response.json());
    } catch (err) {
      return failed(isAbort(err) || signal.aborted ? { kind: "timeout" } : { kind: "parse" });
    }

    const areas = Object.entries(questions).map(([key, question]) =>
      mapArea(key, question, body.answers[key], config.screeningConfidenceThreshold),
    );
    const uncertainKeys = areas.filter((a) => !a.certain || a.refused).map((a) => a.key);
    return finish({
      model: body.model,
      areas,
      allCertain: uncertainKeys.length === 0,
      uncertainKeys,
      costCredits: costOf(body),
      error: null,
    });
  }

  return { screen };
}
