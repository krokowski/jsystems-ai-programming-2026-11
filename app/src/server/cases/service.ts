import "server-only";

import type { CaseSummary } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";

import { notFound } from "../errors";
import { getCaseRepository, type Case } from "./repository";

export type StageName = "analysis" | "decision";

declare global {
  var __hsdcInFlight: Map<string, Promise<unknown>> | undefined;
}

function inFlightMap(): Map<string, Promise<unknown>> {
  const existing = globalThis.__hsdcInFlight;
  if (existing !== undefined) return existing;
  const created = new Map<string, Promise<unknown>>();
  globalThis.__hsdcInFlight = created;
  return created;
}

// Single-flight per case and stage (ADR-003 3.1, ADR-005 A6): a concurrent call joins the running promise.
// The overload keeps the public signature generic while the shared map stays `Promise<unknown>`, without assertions.
export function runSingleFlight<T>(caseId: string, stage: StageName, work: () => Promise<T>): Promise<T>;
export function runSingleFlight(
  caseId: string,
  stage: StageName,
  work: () => Promise<unknown>,
): Promise<unknown> {
  const map = inFlightMap();
  const key = `${caseId}:${stage}`;
  const running = map.get(key);
  if (running !== undefined) return running;
  const promise = Promise.resolve().then(work);
  map.set(key, promise);
  const clear = (): void => {
    if (map.get(key) === promise) map.delete(key);
  };
  promise.then(clear, clear);
  return promise;
}

export function requireCase(caseId: string): Case {
  const found = getCaseRepository().get(caseId);
  if (found === null) throw notFound();
  return found;
}

export function toSummary(c: Case): CaseSummary {
  const decision = c.decision?.decision ?? null;
  return {
    caseType: c.form.caseType,
    category: c.form.category,
    productName: c.form.productName,
    purchaseDate: c.form.purchaseDate,
    thumbnailDataUrl: c.thumbnailDataUrl,
    decision,
    decisionLabel: decision === null ? null : pl.decision.labels[decision],
  };
}

export function resetServiceStateForTests(): void {
  globalThis.__hsdcInFlight = undefined;
}
