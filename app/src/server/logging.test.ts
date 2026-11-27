import { describe, expect, it } from "vitest";

import { logStage, type StageLogEntry } from "./logging";

const base: StageLogEntry = {
  caseId: "7d1c2b3a-0000-4000-8000-000000000001",
  stage: "decision",
  durationMs: 1234,
  model: "openai/example-model",
  promptVersion: "v1",
  path: "fast",
  confidences: { screen: 0.91 },
  decision: "return_approved",
  forcedBy: null,
  modelDecision: "return_approved",
  costCredits: 0.0042,
  status: "ok",
  errorKind: null,
};

describe("logStage", () => {
  it("writes exactly one parseable JSON line with the required fields", () => {
    const lines: string[] = [];
    logStage(base, (line) => lines.push(line));

    expect(lines).toHaveLength(1);
    const parsed: unknown = JSON.parse(lines[0] ?? "");
    expect(parsed).toMatchObject({
      event: "stage",
      level: "info",
      caseId: base.caseId,
      stage: "decision",
      durationMs: 1234,
      costCredits: 0.0042,
    });
    expect(parsed).toMatchObject({ ts: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
  });

  it("uses level error when status is error", () => {
    const lines: string[] = [];
    logStage({ ...base, status: "error", errorKind: "AiTimeoutError" }, (line) => lines.push(line));
    const parsed: unknown = JSON.parse(lines[0] ?? "");
    expect(parsed).toMatchObject({ level: "error", status: "error", errorKind: "AiTimeoutError" });
  });

  it("drops fields that are not part of the typed entry", () => {
    const lines: string[] = [];
    const leaky = { ...base, prompt: "customer reason text", imageBase64: "AAAA" };
    logStage(leaky, (line) => lines.push(line));
    expect(lines[0]).not.toContain("customer reason text");
    expect(lines[0]).not.toContain("AAAA");
  });

  it("writes to console.log by default", () => {
    const original = console.log;
    const calls: unknown[][] = [];
    console.log = (...args: unknown[]) => {
      calls.push(args);
    };
    try {
      logStage(base);
    } finally {
      console.log = original;
    }
    expect(calls).toHaveLength(1);
    expect(typeof calls[0]?.[0]).toBe("string");
  });
});
