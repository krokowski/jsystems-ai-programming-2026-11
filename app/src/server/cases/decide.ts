import "server-only";

import { pl } from "@/lib/i18n-pl";
import { decisionResponseSchema, type DecisionResponse } from "@/lib/schemas";
import { decide } from "@/server/ai/decision/decision-agent";
import { composeFirstMessage } from "@/server/ai/decision/first-message";
import { getModelRegistry } from "@/server/ai/models";
import { ApiError, notFound } from "@/server/errors";

import type { StageDeps } from "./analyze";
import { getCaseRepository, type Case } from "./repository";
import { requireCase, runSingleFlight } from "./service";

// Out-of-order processing call (status "created"): same 409 code as chat-busy, AC-34 message (ADR-005 A6).
function outOfOrder(): ApiError {
  return new ApiError("CASE_STATE", 409, pl.processing.error);
}

function toResponse(c: Case): DecisionResponse {
  const record = c.decision;
  const firstMessage = c.messages[0];
  if (record === null || firstMessage === undefined) throw new Error("Decided case without decision or first message");
  return decisionResponseSchema.parse({
    status: "decided",
    decision: record.decision,
    decisionLabel: pl.decision.labels[record.decision],
    citedRules: record.citedRules,
    firstMessage,
  });
}

// ADR-003 3.1 / 5.3: idempotent once decided; single-flight per case (ADR-005 A6, A8).
export async function decideCase(caseId: string, deps: StageDeps = {}): Promise<DecisionResponse> {
  const existing = requireCase(caseId);
  if (existing.status === "created") throw outOfOrder();
  if (existing.status === "decided") return toResponse(existing);

  return runSingleFlight(caseId, "decision", async (): Promise<DecisionResponse> => {
    const current = requireCase(caseId);
    if (current.status === "decided") return toResponse(current);
    if (current.status === "created" || current.findings === null) throw outOfOrder();
    const registry = deps.registry ?? getModelRegistry();
    const now = deps.now ?? ((): Date => new Date());

    const record = await decide(
      { registry, now },
      {
        caseId,
        caseType: current.form.caseType,
        form: current.form,
        findings: current.findings,
        dateRule: current.dateRule,
        startedAt: Date.now(),
      },
    );
    const firstMessage = composeFirstMessage(record, crypto.randomUUID());
    const updated = getCaseRepository().update(caseId, (c) => ({
      ...c,
      decision: record,
      decisionHistory: [record],
      messages: [firstMessage],
      status: "decided",
    }));
    if (updated === null) throw notFound();
    return toResponse(updated);
  });
}
