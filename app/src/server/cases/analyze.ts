import "server-only";

import { analysisResponseSchema, type AnalysisResponse, type ImageFindings, type ScreeningResult } from "@/lib/schemas";
import { getModelRegistry, type ModelRegistry } from "@/server/ai/models";
import { decideEscalation } from "@/server/ai/screening/escalation";
import { findingsFromScreening } from "@/server/ai/screening/findings-from-screening";
import { createLunaDecisionsScreening } from "@/server/ai/screening/luna-decisions";
import type { ScreeningPort } from "@/server/ai/screening/port";
import { analyzeImage } from "@/server/ai/vision/vision-analysis";
import { getConfig, type AppConfig } from "@/server/config";
import { AiOutputError, AiTimeoutError } from "@/server/errors";
import { logStage } from "@/server/logging";

import { getCaseRepository } from "./repository";
import { requireCase, runSingleFlight } from "./service";

export interface StageDeps {
  registry?: ModelRegistry;
  config?: AppConfig;
  /** Stage 1 adapter; defaults to the Luna Decisions adapter built from `registry` and `config`. */
  screening?: ScreeningPort;
  now?: () => Date;
}

function errorKind(err: unknown): string {
  if (err instanceof AiTimeoutError) return "timeout";
  if (err instanceof AiOutputError) return "invalid_output";
  return "http";
}

function toResponse(findings: ImageFindings): AnalysisResponse {
  return analysisResponseSchema.parse({
    status: "analyzed",
    findingsSource: findings.source,
    photoUsable: findings.photoUsable,
  });
}

function confidences(screening: ScreeningResult): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const area of screening.areas) out[area.key] = area.confidence;
  return out;
}

// ADR-003 3.1 / 5.2: idempotent once analyzed; single-flight per case (ADR-005 A6).
export async function analyzeCase(caseId: string, deps: StageDeps = {}): Promise<AnalysisResponse> {
  const existing = requireCase(caseId);
  if (existing.status !== "created") {
    if (existing.findings === null) throw new Error("Analyzed case without findings");
    return toResponse(existing.findings);
  }

  return runSingleFlight(caseId, "analysis", async (): Promise<AnalysisResponse> => {
    const current = requireCase(caseId);
    if (current.status !== "created") {
      if (current.findings === null) throw new Error("Analyzed case without findings");
      return toResponse(current.findings);
    }
    const config = deps.config ?? getConfig();
    const registry = deps.registry ?? getModelRegistry();
    const screeningPort = deps.screening ?? createLunaDecisionsScreening({ registry, config });
    const startedAt = (deps.now?.() ?? new Date()).getTime();
    const { form, image } = current;
    const caseType = form.caseType;

    const screening = await screeningPort.screen({ caseId, caseType, form, jpeg: image.jpeg });
    const escalation = decideEscalation({ caseType, mode: config.analysisEscalation, screening });
    const path = escalation.action === "skip" ? "fast" : "escalated";

    let findings: ImageFindings;
    try {
      findings =
        escalation.action === "skip"
          ? findingsFromScreening(caseType, screening)
          : await analyzeImage(
              { registry },
              {
                caseId,
                caseType,
                form,
                jpeg: image.jpeg,
                signals: escalation.withSignals ? screening : null,
                uncertainKeys: escalation.uncertainKeys,
                startedAt,
              },
            );
    } catch (err) {
      logStage({
        caseId,
        stage: "analysis",
        durationMs: Date.now() - startedAt,
        path,
        costCredits: screening.costCredits,
        status: "error",
        errorKind: errorKind(err),
      });
      throw err;
    }

    getCaseRepository().update(caseId, (c) => ({ ...c, screening, findings, status: "analyzed" }));
    logStage({
      caseId,
      stage: "analysis",
      durationMs: Date.now() - startedAt,
      model: screening.model,
      promptVersion: screening.promptVersion,
      path,
      confidences: confidences(screening),
      costCredits: screening.costCredits,
      status: "ok",
    });
    return toResponse(findings);
  });
}
