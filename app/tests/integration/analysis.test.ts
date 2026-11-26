import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { analysisResponseSchema, apiErrorBodySchema, createCaseResponseSchema } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";
import { POST as createRoute } from "@/app/api/cases/route";
import { POST as analysisRoute } from "@/app/api/cases/[caseId]/analysis/route";
import { resetModelRegistryForTests } from "@/server/ai/models";
import { resetConfigForTests } from "@/server/config";
import { getCaseRepository } from "@/server/cases/repository";

import {
  captureBody,
  hangingFetch,
  loadCapture,
  replayFetch,
  type ReplayFetch,
  type ReplayStep,
} from "../support/replay-fetch";
import { buildCreateRequest, examplePhoto, setupTestEnv, VALID_FIELDS } from "./helpers";

// Source captures (TR4): s1-return-deny.json (Decisions 200), s2-image-findings.json (vision 200),
// s6-decisions-401.json and s6-chat-401.json (401 "Missing Authentication header").
// Only OpenRouter HTTP is replayed through the global fetch; the real adapters, guards, store and routes run.
const screeningCapture = loadCapture("s1-return-deny.json");
const visionCapture = loadCapture("s2-image-findings.json");
const screening401 = loadCapture("s6-decisions-401.json");
const vision401 = loadCapture("s6-chat-401.json");

const bodySchema = z.looseObject({ answers: z.record(z.string(), z.record(z.string(), z.unknown())) });

/** Derived screening body: only a `noul` value inside the captured structure changes. */
function screeningWith(noul: Record<string, number>): ReplayStep {
  const body = bodySchema.parse(captureBody(screeningCapture));
  for (const [key, value] of Object.entries(noul)) {
    const answer = body.answers[key];
    if (answer === undefined) throw new Error(`capture has no answer ${key}`);
    answer["noul"] = value;
  }
  return { capture: screeningCapture, body };
}

const rawScreening: ReplayStep = { capture: screeningCapture };
const vision: ReplayStep = { capture: visionCapture };

let replay: ReplayFetch;

function stubReplay(steps: readonly ReplayStep[]): ReplayFetch {
  replay = replayFetch(steps);
  vi.stubGlobal("fetch", replay.fetch);
  return replay;
}

function decisionsCalls(): number {
  return replay.calls.filter((c) => c.url.includes("/decisions")).length;
}
function chatCalls(): number {
  return replay.calls.filter((c) => c.url.includes("/chat/completions")).length;
}

async function createCase(): Promise<string> {
  const res = await createRoute(buildCreateRequest(VALID_FIELDS, examplePhoto("phone-1.jpg", "image/jpeg")));
  expect(res.status).toBe(201);
  return createCaseResponseSchema.parse(await res.json()).caseId;
}

function analyze(caseId: string): Promise<Response> {
  return analysisRoute(new Request(`http://localhost/api/cases/${caseId}/analysis`, { method: "POST" }), {
    params: Promise.resolve({ caseId }),
  });
}

async function errorOf(res: Response): Promise<{ text: string; code: string; message: string }> {
  const text = await res.text();
  const body = apiErrorBodySchema.parse(JSON.parse(text));
  return { text, code: body.error.code, message: body.error.message };
}

beforeEach(() => {
  setupTestEnv();
  resetModelRegistryForTests();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.ANALYSIS_ESCALATION;
  resetConfigForTests();
  resetModelRegistryForTests();
});

describe("POST /api/cases/{id}/analysis", () => {
  it("fast path: all areas certain -> findingsSource screening, no vision call (TAC-002-04)", async () => {
    const caseId = await createCase();
    stubReplay([rawScreening]);
    const res = await analyze(caseId);
    expect(res.status).toBe(200);
    expect(analysisResponseSchema.parse(await res.json())).toEqual({
      status: "analyzed",
      findingsSource: "screening",
      photoUsable: true,
    });
    expect(replay.calls).toHaveLength(1);
    expect(chatCalls()).toBe(0);
    const stored = getCaseRepository().get(caseId);
    expect(stored?.status).toBe("analyzed");
    expect(stored?.screening?.allCertain).toBe(true);
    expect(stored?.findings?.source).toBe("screening");
  });

  it("logs one analysis line with the path and no free text", async () => {
    const caseId = await createCase();
    stubReplay([rawScreening]);
    await analyze(caseId);
    const lines = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
    const analysisLines = lines.filter((l) => l.includes('"stage":"analysis"'));
    expect(analysisLines).toHaveLength(1);
    expect(analysisLines[0]).toContain('"path":"fast"');
    expect(analysisLines[0]).not.toContain("Galaxy");
  });

  it("uncertain area (noul 0.79) -> vision called once, findingsSource llm", async () => {
    const caseId = await createCase();
    stubReplay([screeningWith({ photo_usable: 0.79 }), vision]);
    const res = await analyze(caseId);
    expect(res.status).toBe(200);
    expect(analysisResponseSchema.parse(await res.json()).findingsSource).toBe("llm");
    expect(decisionsCalls()).toBe(1);
    expect(chatCalls()).toBe(1);
    expect(replay.calls).toHaveLength(2);
    expect(getCaseRepository().get(caseId)?.findings?.source).toBe("llm");
  });

  it("ANALYSIS_ESCALATION=always escalates even when screening is certain", async () => {
    process.env.ANALYSIS_ESCALATION = "always";
    resetConfigForTests();
    const caseId = await createCase();
    stubReplay([rawScreening, vision]);
    const res = await analyze(caseId);
    expect(res.status).toBe(200);
    expect(analysisResponseSchema.parse(await res.json()).findingsSource).toBe("llm");
    expect(chatCalls()).toBe(1);
  });

  it("screening 401 -> escalates without signals and succeeds via vision", async () => {
    const caseId = await createCase();
    stubReplay([{ capture: screening401 }, vision]);
    const res = await analyze(caseId);
    expect(res.status).toBe(200);
    expect(analysisResponseSchema.parse(await res.json()).findingsSource).toBe("llm");
    expect(replay.calls).toHaveLength(2);
    expect(getCaseRepository().get(caseId)?.screening?.error?.kind).toBe("http");
  });

  it("screening 401 + vision 401 -> 502 AI_UNAVAILABLE, case stays created, retry succeeds", async () => {
    const caseId = await createCase();
    stubReplay([{ capture: screening401 }, { capture: vision401 }]);
    const res = await analyze(caseId);
    expect(res.status).toBe(502);
    const err = await errorOf(res);
    expect(err.code).toBe("AI_UNAVAILABLE");
    expect(err.message).toBe(pl.processing.error);
    expect(err.text).not.toMatch(/401|Authentication|openrouter/i);
    const stored = getCaseRepository().get(caseId);
    expect(stored?.status).toBe("created");
    expect(stored?.screening).toBeNull();
    expect(stored?.findings).toBeNull();

    stubReplay([rawScreening]);
    const retry = await analyze(caseId);
    expect(retry.status).toBe(200);
    expect(getCaseRepository().get(caseId)?.status).toBe("analyzed");
  });

  it("vision timeout (hanging fetch near the end of the 58 s budget) -> 504 AI_TIMEOUT", async () => {
    const caseId = await createCase();
    const first = replayFetch([screeningWith({ photo_usable: 0.79 })]);
    const hang = hangingFetch();
    let calls = 0;
    const combined: typeof fetch = (input, init) => {
      calls += 1;
      return calls === 1 ? first.fetch(input, init) : hang.fetch(input, init);
    };
    replay = first;
    vi.stubGlobal("fetch", combined);
    // The stage clock starts the 58 s budget 57.9 s in the past, so the remaining budget is ~100 ms.
    const { analyzeCase } = await import("@/server/cases/analyze");
    const outcome = await analyzeCase(caseId, { now: () => new Date(Date.now() - 57_900) }).then(
      () => null,
      (err: unknown) => err,
    );
    expect(outcome).toMatchObject({ name: "AiTimeoutError" });
    expect(hang.calls).toHaveLength(1);
    expect(getCaseRepository().get(caseId)?.status).toBe("created");
  });

  it("a second call after success returns the stored result with no AI call", async () => {
    const caseId = await createCase();
    stubReplay([rawScreening]);
    const first = await analyze(caseId);
    const firstBody: unknown = await first.json();
    const second = await analyze(caseId);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstBody);
    expect(replay.calls).toHaveLength(1);
  });

  it("two concurrent calls share one run (A6)", async () => {
    const caseId = await createCase();
    stubReplay([rawScreening]);
    const [a, b] = await Promise.all([analyze(caseId), analyze(caseId)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(replay.calls).toHaveLength(1);
  });

  it("unknown case id -> 404 CASE_NOT_FOUND", async () => {
    stubReplay([]);
    const res = await analyze("2b9a8f64-4a2a-4a37-9d2a-3a5e9a1b0c11");
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("CASE_NOT_FOUND");
    expect(replay.calls).toHaveLength(0);
  });
});
