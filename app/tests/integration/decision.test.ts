import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { pl } from "@/lib/i18n-pl";
import {
  analysisResponseSchema,
  apiErrorBodySchema,
  createCaseResponseSchema,
  decisionResponseSchema,
} from "@/lib/schemas";
import { todayInAppZone } from "@/lib/time";
import { POST as createRoute } from "@/app/api/cases/route";
import { POST as analysisRoute } from "@/app/api/cases/[caseId]/analysis/route";
import { POST as decisionRoute } from "@/app/api/cases/[caseId]/decision/route";
import { resetModelRegistryForTests } from "@/server/ai/models";
import { resetConfigForTests } from "@/server/config";
import { getCaseRepository } from "@/server/cases/repository";
import { toSummary } from "@/server/cases/service";

import { captureBody, loadCapture, replayFetch, type Capture, type ReplayFetch, type ReplayStep } from "../support/replay-fetch";
import { buildCreateRequest, examplePhoto, setupTestEnv, VALID_FIELDS, type CreateFields } from "./helpers";

// Source captures (TR4): s2-image-findings.json (vision 200), s5-decision.json (decision 200).
// Derived variants only change values inside the captured message.content JSON string.
// ANALYSIS_ESCALATION=always makes the analysis stage use the vision capture (usable photo, categoryMatch true).
const visionCapture = loadCapture("s2-image-findings.json");
const decisionCapture = loadCapture("s5-decision.json");

const completionSchema = z.looseObject({
  choices: z.array(z.looseObject({ message: z.looseObject({ content: z.string() }) })).min(1),
});

function withContent(capture: Capture, patch: Record<string, unknown>): ReplayStep {
  const body = completionSchema.parse(captureBody(capture));
  const message = body.choices[0]?.message;
  if (message === undefined) throw new Error("capture has no choice");
  const content: unknown = JSON.parse(message.content);
  message.content = JSON.stringify({ ...z.record(z.string(), z.unknown()).parse(content), ...patch });
  return { capture, body };
}

const vision: ReplayStep = { capture: visionCapture };
const decision: ReplayStep = { capture: decisionCapture };

let replay: ReplayFetch;
function stubReplay(steps: readonly ReplayStep[]): ReplayFetch {
  replay = replayFetch(steps);
  vi.stubGlobal("fetch", replay.fetch);
  return replay;
}

function daysAgo(days: number): string {
  return todayInAppZone(new Date(Date.now() - days * 86_400_000));
}

async function createCase(fields: CreateFields = VALID_FIELDS): Promise<string> {
  const res = await createRoute(buildCreateRequest(fields, examplePhoto("phone-1.jpg", "image/jpeg")));
  expect(res.status).toBe(201);
  return createCaseResponseSchema.parse(await res.json()).caseId;
}

function call(route: typeof analysisRoute, caseId: string): Promise<Response> {
  return route(new Request(`http://localhost/api/cases/${caseId}/x`, { method: "POST" }), {
    params: Promise.resolve({ caseId }),
  });
}

/** Creates a case and runs the real analysis route (escalation always): raw screening capture + findings step. */
async function prepare(findingsStep: ReplayStep = vision, fields: CreateFields = VALID_FIELDS): Promise<string> {
  process.env.ANALYSIS_ESCALATION = "always";
  resetConfigForTests();
  const caseId = await createCase(fields);
  stubReplay([{ capture: loadCapture("s1-return-deny.json") }, findingsStep]);
  const res = await call(analysisRoute, caseId);
  expect(res.status).toBe(200);
  analysisResponseSchema.parse(await res.json());
  return caseId;
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

describe("POST /api/cases/{id}/decision", () => {
  it("happy path: 200, five-part first message (TAC-002-05), case decided, summary has the decision", async () => {
    const caseId = await prepare();
    stubReplay([decision]);
    const res = await call(decisionRoute, caseId);
    expect(res.status).toBe(200);
    const body = decisionResponseSchema.parse(await res.json());
    expect(body.status).toBe("decided");
    expect(body.decision).toBe("reject");
    expect(body.decisionLabel).toBe(pl.decision.labels.reject);
    const message = z.looseObject({ role: z.literal("assistant"), parts: z.array(z.looseObject({ type: z.string() })) }).parse(body.firstMessage);
    expect(message.parts.map((p) => p.type)).toEqual(["text", "data-decision", "text", "text", "text"]);
    expect(replay.calls).toHaveLength(1);

    const stored = getCaseRepository().get(caseId);
    expect(stored?.status).toBe("decided");
    expect(stored?.decisionHistory).toHaveLength(1);
    expect(stored?.messages).toHaveLength(1);
    const summary = stored === null || stored === undefined ? null : toSummary(stored);
    expect(summary?.decision).toBe("reject");
    expect(summary?.decisionLabel).toBe("Odrzucono");
  });

  it("before analysis -> 409 CASE_STATE with the processing message, no AI call", async () => {
    const caseId = await createCase();
    stubReplay([]);
    const res = await call(decisionRoute, caseId);
    expect(res.status).toBe(409);
    const err = await errorOf(res);
    expect(err.code).toBe("CASE_STATE");
    expect(err.message).toBe(pl.processing.error);
    expect(replay.calls).toHaveLength(0);
  });

  it("unknown case id -> 404 CASE_NOT_FOUND", async () => {
    stubReplay([]);
    const res = await call(decisionRoute, "2b9a8f64-4a2a-4a37-9d2a-3a5e9a1b0c11");
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("CASE_NOT_FOUND");
  });

  it("return 30 days after purchase + model approve -> reject by R1.1 (scenario 2)", async () => {
    const caseId = await prepare(vision, { ...VALID_FIELDS, purchaseDate: daysAgo(30) });
    stubReplay([withContent(decisionCapture, { decision: "approve", citedRules: ["R2.1"] })]);
    const res = await call(decisionRoute, caseId);
    expect(res.status).toBe(200);
    const body = decisionResponseSchema.parse(await res.json());
    expect(body.decision).toBe("reject");
    expect(body.citedRules[0]).toBe("R1.1");
    expect(body.decisionLabel).toBe("Odrzucono");
    const record = getCaseRepository().get(caseId)?.decision;
    expect(record).toMatchObject({ forcedBy: "date_rule", modelDecision: "approve" });
    expect(JSON.stringify(body.firstMessage)).toContain('"label":"Odrzucono"');
  });

  it("complaint 25 months after purchase + model approve -> reject by C1.1", async () => {
    const complaint: CreateFields = {
      caseType: "complaint",
      category: "smartphone",
      productName: "Galaxy S24",
      purchaseDate: daysAgo(25 * 31),
      reason: "Ekran pękł podczas normalnego użytkowania telefonu.",
    };
    const caseId = await prepare(vision, complaint);
    stubReplay([withContent(decisionCapture, { decision: "approve", citedRules: ["C1.1"] })]);
    const res = await call(decisionRoute, caseId);
    expect(res.status).toBe(200);
    const body = decisionResponseSchema.parse(await res.json());
    expect(body.decision).toBe("reject");
    expect(body.citedRules[0]).toBe("C1.1");
  });

  it("unusable photo (vision usabilityIssue blurry) in period -> manual_review (scenario 6)", async () => {
    const caseId = await prepare(withContent(visionCapture, { photoUsable: false, usabilityIssue: "blurry" }));
    stubReplay([withContent(decisionCapture, { decision: "approve", citedRules: ["R2.1"] })]);
    const res = await call(decisionRoute, caseId);
    const body = decisionResponseSchema.parse(await res.json());
    expect(body.decision).toBe("manual_review");
    expect(getCaseRepository().get(caseId)?.decision).toMatchObject({ forcedBy: "unusable_photo" });
  });

  it("out of period + unusable photo -> reject (A3: the period rule wins)", async () => {
    const caseId = await prepare(withContent(visionCapture, { photoUsable: false, usabilityIssue: "blurry" }), {
      ...VALID_FIELDS,
      purchaseDate: daysAgo(30),
    });
    stubReplay([withContent(decisionCapture, { decision: "manual_review", citedRules: ["R2.1"] })]);
    const body = decisionResponseSchema.parse(await (await call(decisionRoute, caseId)).json());
    expect(body.decision).toBe("reject");
    expect(getCaseRepository().get(caseId)?.decision).toMatchObject({ forcedBy: "date_rule" });
  });

  it("unknown rule R9.9 twice -> 502 AI_UNAVAILABLE, case stays analyzed (scenario 7)", async () => {
    const caseId = await prepare();
    const bad = withContent(decisionCapture, { citedRules: ["R9.9"] });
    stubReplay([bad, bad]);
    const res = await call(decisionRoute, caseId);
    expect(res.status).toBe(502);
    const err = await errorOf(res);
    expect(err.code).toBe("AI_UNAVAILABLE");
    expect(err.message).toBe(pl.processing.error);
    expect(err.text).not.toContain("R9.9");
    expect(replay.calls).toHaveLength(2);
    expect(getCaseRepository().get(caseId)?.status).toBe("analyzed");
  });

  it("R9.9 once then a valid answer -> 200 after a retry (2 calls)", async () => {
    const caseId = await prepare();
    stubReplay([withContent(decisionCapture, { citedRules: ["R9.9"] }), decision]);
    const res = await call(decisionRoute, caseId);
    expect(res.status).toBe(200);
    expect(replay.calls).toHaveLength(2);
  });

  it("a second call returns the stored body with no extra AI call", async () => {
    const caseId = await prepare();
    stubReplay([decision]);
    const first: unknown = await (await call(decisionRoute, caseId)).json();
    const second = await call(decisionRoute, caseId);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(first);
    expect(replay.calls).toHaveLength(1);
  });

  it("two concurrent calls make one model call (A6)", async () => {
    const caseId = await prepare();
    stubReplay([decision]);
    const [a, b] = await Promise.all([call(decisionRoute, caseId), call(decisionRoute, caseId)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await a.json()).toEqual(await b.json());
    expect(replay.calls).toHaveLength(1);
  });
});
