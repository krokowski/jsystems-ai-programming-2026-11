import "server-only";

import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import { pl } from "@/lib/i18n-pl";
import type { CaseForm } from "@/lib/schemas/case-form";
import { imageFindingsSchema, type ImageFindings, type ScreeningResult } from "@/lib/schemas/domain";
import type { CaseType } from "@/lib/schemas/enums";
import { BUDGETS, remainingMs } from "@/server/ai/budgets";
import type { ModelRegistry } from "@/server/ai/models";
import { customerDataBlock, renderPrompt } from "@/server/ai/prompt-library";
import { AiOutputError, AiTimeoutError, AiUnavailableError } from "@/server/errors";
import { logStage } from "@/server/logging";

export interface VisionInput {
  caseId: string;
  caseType: CaseType;
  form: CaseForm;
  jpeg: Buffer;
  signals: ScreeningResult | null;
  uncertainKeys: string[];
  startedAt: number;
}

const SCREENING_UNAVAILABLE = "Screening was unavailable. No prior signals are given; rely only on the photo.";
const AUDIO_NOTE =
  "Category is audio. If these are in-ear headphones, the hygienic seal cannot be verified from a photo: do not state that it is intact; say so in `notes`.";

const costSchema = z.object({
  openrouter: z.object({
    usage: z.object({
      cost: z.number().nullish(),
      costDetails: z.object({ upstreamInferenceCost: z.number().nullish() }).nullish(),
    }),
  }),
});

// BYOK: usage.cost is 0, the real spend is the upstream inference cost (ADR-005 A22).
function costCredits(providerMetadata: unknown): number | null {
  const parsed = costSchema.safeParse(providerMetadata);
  if (!parsed.success) return null;
  const usage = parsed.data.openrouter.usage;
  const direct = usage.cost ?? 0;
  if (direct > 0) return direct;
  return usage.costDetails?.upstreamInferenceCost ?? null;
}

function caseFacts(input: VisionInput): string {
  const { form } = input;
  return [
    `Case type: ${input.caseType}`,
    `Declared category: ${form.category} (${pl.form.categoryLabels[form.category]})`,
    `Product name: ${form.productName}`,
    `Purchase date: ${form.purchaseDate}`,
  ].join("\n");
}

function signalsText(input: VisionInput): string {
  const { signals } = input;
  if (signals === null || signals.error !== null || signals.areas.length === 0) return SCREENING_UNAVAILABLE;
  const uncertain = new Set(input.uncertainKeys);
  return signals.areas
    .map((area) => {
      const confidence = area.confidence === null ? "n/a" : area.confidence.toFixed(2);
      const value = area.refused || area.value === null ? "no answer" : String(area.value);
      const flag = uncertain.has(area.key) || !area.certain ? " [UNCERTAIN]" : "";
      return `- ${area.key}: ${value} (confidence ${confidence})${flag}`;
    })
    .join("\n");
}

function buildPrompt(input: VisionInput): { text: string; version: string } {
  const reason = input.form.reason.length > 0 ? customerDataBlock("reason", input.form.reason) : "(the customer gave no description)";
  const notes = input.caseType === "return" && input.form.category === "audio" ? AUDIO_NOTE : "";
  const rendered = renderPrompt(input.caseType === "return" ? "vision-return" : "vision-complaint", {
    caseFacts: caseFacts(input),
    customerReason: reason,
    screeningSignals: signalsText(input),
    categoryNotes: notes,
  });
  return { text: rendered.text, version: rendered.version };
}

// A4: rules the model schema cannot express on its own.
function violatesA4(caseType: CaseType, findings: ImageFindings): string | null {
  if (!findings.photoUsable && findings.usabilityIssue === null) return "usabilityIssue missing";
  if (caseType === "complaint" && findings.damageVisible && (findings.damageLocation === null || findings.damageLocation.trim() === "")) {
    return "damageLocation missing";
  }
  return null;
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

class InvalidOutput extends Error {}

export async function analyzeImage(deps: { registry: ModelRegistry }, input: VisionInput): Promise<ImageFindings> {
  const { registry } = deps;
  const prompt = buildPrompt(input);
  const model = registry.modelId("vision");
  const startedCall = Date.now();
  let cost: number | null = null;

  const log = (status: "ok" | "error", errorKind: string | null): void => {
    logStage({
      caseId: input.caseId,
      stage: "vision",
      durationMs: Date.now() - startedCall,
      model,
      promptVersion: prompt.version,
      path: "escalated",
      costCredits: cost,
      status,
      errorKind,
    });
  };

  const attemptOnce = async (): Promise<ImageFindings> => {
    const remaining = remainingMs(input.startedAt, BUDGETS.analysisMs);
    if (remaining <= 0) throw new AiTimeoutError("Vision analysis budget exhausted");
    try {
      const result = await generateText({
        model: registry.languageModel("vision"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt.text },
              { type: "file", mediaType: "image/jpeg", data: input.jpeg },
            ],
          },
        ],
        output: Output.object({ schema: imageFindingsSchema }),
        abortSignal: AbortSignal.timeout(remaining),
        maxRetries: remaining >= BUDGETS.retryMinRemainingMs ? 1 : 0,
      });
      cost = costCredits(result.providerMetadata) ?? cost;
      const findings: ImageFindings = { ...result.output, source: "llm" };
      const violation = violatesA4(input.caseType, findings);
      if (violation !== null) throw new InvalidOutput(violation);
      return findings;
    } catch (err) {
      if (err instanceof InvalidOutput) throw err;
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new InvalidOutput("schema-invalid output", { cause: err });
      }
      if (isAbort(err)) throw new AiTimeoutError("Vision analysis timed out", { cause: err });
      if (APICallError.isInstance(err)) {
        throw new AiUnavailableError(`Vision provider error (status ${String(err.statusCode)})`, { cause: err });
      }
      throw new AiUnavailableError("Vision call failed", { cause: err });
    }
  };

  try {
    try {
      const findings = await attemptOnce();
      log("ok", null);
      return findings;
    } catch (err) {
      if (!(err instanceof InvalidOutput)) throw err;
      if (remainingMs(input.startedAt, BUDGETS.analysisMs) < BUDGETS.retryMinRemainingMs) {
        throw new AiOutputError("Vision output invalid and no budget left to retry", { cause: err });
      }
    }
    try {
      const findings = await attemptOnce();
      log("ok", null);
      return findings;
    } catch (err) {
      if (err instanceof InvalidOutput) throw new AiOutputError("Vision output invalid after retry", { cause: err });
      throw err;
    }
  } catch (err) {
    log("error", err instanceof Error ? err.name : "unknown");
    throw err;
  }
}
