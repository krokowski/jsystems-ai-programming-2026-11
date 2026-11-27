import "server-only";

export type StageName = "create" | "analysis" | "screening" | "vision" | "decision" | "chat";

// Typed fields only: free text and image data cannot be logged through this entry (ADR-000 8.11).
export interface StageLogEntry {
  caseId: string;
  stage: StageName;
  durationMs: number;
  model?: string | null;
  promptVersion?: string | null;
  path?: "fast" | "escalated" | null;
  confidences?: Record<string, number | null>;
  decision?: string | null;
  forcedBy?: string | null;
  modelDecision?: string | null;
  costCredits?: number | null;
  status: "ok" | "error";
  errorKind?: string | null;
}

type LogSink = (line: string) => void;

// Writes one JSON line per pipeline stage. Only the known fields are copied, so extra properties are dropped.
export function logStage(entry: StageLogEntry, sink: LogSink = (line) => console.log(line)): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: entry.status === "error" ? "error" : "info",
    event: "stage",
    caseId: entry.caseId,
    stage: entry.stage,
    durationMs: entry.durationMs,
    model: entry.model,
    promptVersion: entry.promptVersion,
    path: entry.path,
    confidences: entry.confidences,
    decision: entry.decision,
    forcedBy: entry.forcedBy,
    modelDecision: entry.modelDecision,
    costCredits: entry.costCredits,
    status: entry.status,
    errorKind: entry.errorKind,
  });
  sink(line);
}
