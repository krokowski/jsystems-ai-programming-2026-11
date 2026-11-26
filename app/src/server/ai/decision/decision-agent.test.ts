import "server-only";

import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decisionRecordSchema, imageFindingsSchema } from "@/lib/schemas";
import type { CaseForm, DateRuleResult, ImageFindings } from "@/lib/schemas";
import { parseConfig, resetConfigForTests } from "@/server/config";
import { AiTimeoutError, AiUnavailableError } from "@/server/errors";
import { createModelRegistry } from "@/server/ai/models";
import { BUDGETS } from "@/server/ai/budgets";
import { resetPolicyCacheForTests, getPolicy } from "@/server/policies/policy-loader";
import { computeDateRule } from "@/server/rules/date-rules";
import {
  captureBody,
  hangingFetch,
  loadCapture,
  replayFetch,
  type Capture,
  type RecordedCall,
  type ReplayStep,
} from "../../../../tests/support/replay-fetch";

import { decide } from "./decision-agent";

// Sources: s5-decision.json (200, non-streaming structured decision), s6-chat-401.json (401
// "Missing Authentication header"; same provider error envelope for any chat-completions call),
// s2-image-findings.json (the valid findings object used as decision input).

const POLICY_DIR = resolve(process.cwd(), "../docs/policies");
const NOW = new Date("2026-11-26T10:00:00.000Z");

const decisionCapture = loadCapture("s5-decision.json");
const unauthorizedCapture = loadCapture("s6-chat-401.json");
const findingsCapture = loadCapture("s2-image-findings.json");

const config = parseConfig({
  OPENROUTER_API_KEY: "test-key",
  LLM_MODEL: "openai/gpt-6-luna",
  POLICY_DIR,
});

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
  return Object.fromEntries(Object.entries(value));
}

function capturedFindings(): ImageFindings {
  const body = asRecord(captureBody(findingsCapture));
  const choices = body["choices"];
  const first: unknown = Array.isArray(choices) ? choices[0] : undefined;
  const content = asRecord(asRecord(asRecord(first)["message"]))["content"];
  if (typeof content !== "string") throw new Error("no content");
  return imageFindingsSchema.parse(JSON.parse(content));
}

/** Derived decision body: only values inside the captured content JSON change. */
function derivedDecisionBody(patch: Record<string, unknown>): unknown {
  const body = asRecord(captureBody(decisionCapture));
  const choices = body["choices"];
  const first = Array.isArray(choices) ? asRecord(choices[0]) : null;
  if (first === null) throw new Error("no choices");
  const message = asRecord(first["message"]);
  const content = message["content"];
  if (typeof content !== "string") throw new Error("no content");
  const parsed = asRecord(JSON.parse(content));
  message["content"] = JSON.stringify({ ...parsed, ...patch });
  first["message"] = message;
  body["choices"] = [first];
  return body;
}

function step(capture: Capture, body?: unknown): ReplayStep {
  return body === undefined ? { capture } : { capture, body };
}

const returnForm: CaseForm = {
  caseType: "return",
  category: "smartphone",
  productName: "Phone X",
  purchaseDate: "2026-11-20",
  reason: "Nie podoba mi sie.",
};
const complaintForm: CaseForm = {
  caseType: "complaint",
  category: "smartphone",
  productName: "Phone X",
  purchaseDate: "2026-11-20",
  reason: "Ekran pekl sam z siebie po tygodniu.",
};

const inPeriodReturn = computeDateRule({ caseType: "return", purchaseDate: "2026-11-20", referenceDate: "2026-11-26" });
const lateReturn = computeDateRule({ caseType: "return", purchaseDate: "2026-10-01", referenceDate: "2026-11-26" });
const lateComplaint = computeDateRule({ caseType: "complaint", purchaseDate: "2024-01-10", referenceDate: "2026-11-26" });

function run(
  fetchImpl: typeof fetch,
  over: {
    caseType?: "return" | "complaint";
    form?: CaseForm;
    findings?: ImageFindings;
    dateRule?: DateRuleResult;
    startedAt?: number;
  } = {},
): ReturnType<typeof decide> {
  const registry = createModelRegistry({ config, fetch: fetchImpl });
  const caseType = over.caseType ?? "return";
  return decide(
    { registry, now: () => NOW },
    {
      caseId: "case-1",
      caseType,
      form: over.form ?? (caseType === "return" ? returnForm : complaintForm),
      findings: over.findings ?? capturedFindings(),
      dateRule: over.dateRule ?? inPeriodReturn,
      startedAt: over.startedAt ?? Date.now(),
    },
  );
}

function systemText(call: RecordedCall | undefined): string {
  const body = asRecord(call?.body);
  const messages = body["messages"];
  if (!Array.isArray(messages)) throw new Error("no messages");
  return messages.map((m: unknown) => contentText(asRecord(m)["content"])).join("\n");
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: unknown) => {
      const text = asRecord(part)["text"];
      return typeof text === "string" ? text : "";
    })
    .join("\n");
}

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
  vi.stubEnv("POLICY_DIR", POLICY_DIR);
  resetConfigForTests();
  resetPolicyCacheForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetConfigForTests();
  resetPolicyCacheForTests();
});

describe("decide (replay of s5-decision.json)", () => {
  it("turns the captured valid response into an initial DecisionRecord", async () => {
    const replay = replayFetch([step(decisionCapture)]);
    const record = await run(replay.fetch);

    expect(decisionRecordSchema.safeParse(record).success).toBe(true);
    expect(record.origin).toBe("initial");
    expect(record.decision).toBe("reject");
    expect(record.modelDecision).toBe("reject");
    expect(record.forcedBy).toBeNull();
    expect(record.citedRules).toEqual(["R2.1", "R4.2", "R6.1", "R6.2"]);
    expect(record.createdAt).toBe(NOW.toISOString());
    expect(replay.calls).toHaveLength(1);
  });

  it("logs one stage line with the BYOK upstream cost from the captured usage (A22)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      await run(replayFetch([step(decisionCapture)]).fetch);
      const lines = spy.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('"stage":"decision"'));
      expect(lines).toHaveLength(1);
      const entry = asRecord(JSON.parse(lines[0] ?? "{}"));
      expect(entry["costCredits"]).toBeCloseTo(0.000245, 9);
      expect(entry["status"]).toBe("ok");
      expect(entry["modelDecision"]).toBe("reject");
      expect(lines[0]).not.toContain("Nie podoba");
    } finally {
      spy.mockRestore();
    }
  });

  it("sends the structured-output request through the real provider", async () => {
    const replay = replayFetch([step(decisionCapture)]);
    await run(replay.fetch);
    const body = asRecord(replay.calls[0]?.body);
    expect(replay.calls[0]?.url).toContain("/chat/completions");
    expect(asRecord(body["response_format"])["type"]).toBe("json_schema");
    expect(asRecord(body["provider"])["data_collection"]).toBe("deny");
    expect(asRecord(body["reasoning"])["effort"]).toBe("medium");
  });

  it("puts policy, delimited reason, date facts and findings in the prompt; no forced sentence when unforced", async () => {
    const replay = replayFetch([step(decisionCapture)]);
    await run(replay.fetch);
    const text = systemText(replay.calls[0]);
    expect(text).toContain(getPolicy("return").text.slice(0, 80));
    expect(text).toContain('<customer_data label="reason">');
    expect(text).toContain("Nie podoba mi sie.");
    expect(text).toContain(`Days since purchase: ${inPeriodReturn.daysSincePurchase}`);
    expect(text).toContain(`Deadline: ${inPeriodReturn.deadline}`);
    expect(text).toContain("source: llm");
    expect(text).not.toContain("The decision is fixed to");
  });

  it("overrides an approve with reject when the return window has passed (date_rule)", async () => {
    const replay = replayFetch([step(decisionCapture, derivedDecisionBody({ decision: "approve" }))]);
    const record = await run(replay.fetch, { dateRule: lateReturn });
    expect(record.decision).toBe("reject");
    expect(record.citedRules[0]).toBe("R1.1");
    expect(record.forcedBy).toBe("date_rule");
    expect(record.modelDecision).toBe("approve");
    expect(systemText(replay.calls[0])).toContain("The decision is fixed to reject");
    expect(decisionRecordSchema.safeParse(record).success).toBe(true);
  });

  it("cites C1.1 for a complaint out of period", async () => {
    const replay = replayFetch([
      step(decisionCapture, derivedDecisionBody({ decision: "approve", citedRules: ["C2.1"] })),
    ]);
    const record = await run(replay.fetch, { caseType: "complaint", dateRule: lateComplaint });
    expect(record.decision).toBe("reject");
    expect(record.citedRules[0]).toBe("C1.1");
    expect(record.forcedBy).toBe("date_rule");
    expect(systemText(replay.calls[0])).toContain("Complaint Policy");
  });

  it("forces manual_review for an unusable photo", async () => {
    const findings: ImageFindings = { ...capturedFindings(), photoUsable: false, usabilityIssue: "blurry" };
    const replay = replayFetch([step(decisionCapture, derivedDecisionBody({ decision: "approve" }))]);
    const record = await run(replay.fetch, { findings });
    expect(record.decision).toBe("manual_review");
    expect(record.forcedBy).toBe("unusable_photo");
    expect(record.modelDecision).toBe("approve");
    expect(record.citedRules).toContain("R4.3");
  });

  it("rejects out of period even when the photo is unusable (A3)", async () => {
    const findings: ImageFindings = { ...capturedFindings(), photoUsable: false, usabilityIssue: "blurry" };
    const replay = replayFetch([step(decisionCapture)]);
    const record = await run(replay.fetch, { findings, dateRule: lateReturn });
    expect(record.decision).toBe("reject");
    expect(record.forcedBy).toBe("date_rule");
  });

  it("states complaint date facts including the cosmetic window", async () => {
    const replay = replayFetch([step(decisionCapture, derivedDecisionBody({ citedRules: ["C2.1"] }))]);
    const dateRule = computeDateRule({ caseType: "complaint", purchaseDate: "2026-11-20", referenceDate: "2026-11-26" });
    await run(replay.fetch, { caseType: "complaint", dateRule });
    expect(systemText(replay.calls[0])).toContain("Within 14-day cosmetic-defect window (C2.3): yes");
  });

  it("retries once with the validation error when a cited rule is unknown", async () => {
    const replay = replayFetch([
      step(decisionCapture, derivedDecisionBody({ citedRules: ["R9.9"] })),
      step(decisionCapture),
    ]);
    const record = await run(replay.fetch);
    expect(replay.calls).toHaveLength(2);
    expect(record.citedRules).toEqual(["R2.1", "R4.2", "R6.1", "R6.2"]);
    expect(systemText(replay.calls[1])).toContain("R9.9");
    expect(systemText(replay.calls[0])).not.toContain("R9.9");
  });

  it("fails with AiUnavailableError when rules stay invalid after the retry", async () => {
    const bad = derivedDecisionBody({ citedRules: ["R9.9"] });
    const replay = replayFetch([step(decisionCapture, bad), step(decisionCapture, bad)]);
    await expect(run(replay.fetch)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(replay.calls).toHaveLength(2);
  });

  it("treats empty citedRules as invalid", async () => {
    const bad = derivedDecisionBody({ citedRules: [] });
    const replay = replayFetch([step(decisionCapture, bad), step(decisionCapture, bad)]);
    await expect(run(replay.fetch)).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("does not retry when less than 15 s remain", async () => {
    const bad = derivedDecisionBody({ citedRules: ["R9.9"] });
    const replay = replayFetch([step(decisionCapture, bad), step(decisionCapture)]);
    const startedAt = Date.now() - (BUDGETS.decisionMs - (BUDGETS.retryMinRemainingMs - 2_000));
    await expect(run(replay.fetch, { startedAt })).rejects.toBeInstanceOf(AiUnavailableError);
    expect(replay.calls).toHaveLength(1);
  });

  it("maps the 401 capture to AiUnavailableError", async () => {
    const replay = replayFetch([step(unauthorizedCapture)]);
    await expect(run(replay.fetch)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(replay.calls).toHaveLength(1);
  });

  it("maps a hanging provider with an exhausted budget to AiTimeoutError", async () => {
    const hanging = hangingFetch();
    const startedAt = Date.now() - (BUDGETS.decisionMs - 50);
    await expect(run(hanging.fetch, { startedAt })).rejects.toBeInstanceOf(AiTimeoutError);
  });
});
