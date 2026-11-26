import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { pl } from "@/lib/i18n-pl";
import { analysisResponseSchema, apiErrorBodySchema, createCaseResponseSchema, decisionResponseSchema } from "@/lib/schemas";
import { POST as createRoute } from "@/app/api/cases/route";
import { POST as analysisRoute } from "@/app/api/cases/[caseId]/analysis/route";
import { POST as decisionRoute } from "@/app/api/cases/[caseId]/decision/route";
import { POST as chatRoute } from "@/app/api/cases/[caseId]/chat/route";
import { resetModelRegistryForTests } from "@/server/ai/models";
import { chatCase } from "@/server/cases/chat";
import { resetConfigForTests } from "@/server/config";
import { getCaseRepository } from "@/server/cases/repository";

import { captureBody, hangingFetch, loadCapture, replayFetch, type Capture, type ReplayFetch, type ReplayStep } from "../support/replay-fetch";
import { buildCreateRequest, examplePhoto, setupTestEnv, VALID_FIELDS } from "./helpers";

// Source captures (TR4): s1-return-deny / s2-image-findings (analysis), s5-decision (decision),
// s5-chat-stream (+ followup-refused / -accepted) and s6-chat-401 (chat). Derived variants only change
// values inside the captured structure (decision argument fragments, message.content JSON values).
const NOW = new Date("2026-11-26T10:00:00.000Z");
const QUESTION = "Czy mogę jeszcze coś zrobić w tej sprawie?";

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

function replaceOnce(text: string, from: string, to: string): string {
  const parts = text.split(from);
  if (parts.length !== 2) throw new Error(`expected exactly one occurrence of ${from}`);
  return parts.join(to);
}

/** Derived step 1: the captured tool call with the decision argument changed (fragments "manual" + "_review"). */
function toolCallWithDecision(decision: string): string {
  const raw = loadCapture("s5-chat-stream.json").response.rawText;
  if (raw === undefined) throw new Error("capture has no rawText");
  return replaceOnce(replaceOnce(raw, '"arguments":"manual"', `"arguments":"${decision}"`), '"arguments":"_review"', '"arguments":""');
}

const COMPLAINT = {
  caseType: "complaint",
  category: "smartphone",
  productName: "Galaxy S24",
  purchaseDate: "2026-09-01",
  reason: "Ekran pękł podczas normalnego użytkowania telefonu.",
};

const refusedSteps: ReplayStep[] = [
  { capture: loadCapture("s5-chat-stream.json") },
  { capture: loadCapture("s5-chat-followup-refused.json") },
];
const acceptedSteps: ReplayStep[] = [
  { capture: loadCapture("s5-chat-stream.json"), rawText: toolCallWithDecision("approve") },
  { capture: loadCapture("s5-chat-followup-accepted.json") },
];

let replay: ReplayFetch;
function stubFetch(next: ReplayFetch): ReplayFetch {
  replay = next;
  vi.stubGlobal("fetch", replay.fetch);
  return replay;
}
function stubReplay(steps: readonly ReplayStep[]): ReplayFetch {
  return stubFetch(replayFetch(steps));
}

function call(route: typeof analysisRoute, caseId: string): Promise<Response> {
  return route(new Request(`http://localhost/api/cases/${caseId}/x`, { method: "POST" }), {
    params: Promise.resolve({ caseId }),
  });
}

interface PrepareOptions {
  fields?: Record<string, string>;
  decisionStep?: ReplayStep;
  screening?: string;
}

/** Create -> analysis (escalation always) -> decision through the real handlers. */
async function prepareDecided(options: PrepareOptions = {}): Promise<string> {
  process.env.ANALYSIS_ESCALATION = "always";
  resetConfigForTests();
  const res = await createRoute(buildCreateRequest({ ...VALID_FIELDS, ...options.fields }, examplePhoto("phone-1.jpg", "image/jpeg")));
  expect(res.status).toBe(201);
  const caseId = createCaseResponseSchema.parse(await res.json()).caseId;
  stubReplay([{ capture: loadCapture(options.screening ?? "s1-return-deny.json") }, { capture: loadCapture("s2-image-findings.json") }]);
  const analysis = await call(analysisRoute, caseId);
  expect(analysis.status).toBe(200);
  analysisResponseSchema.parse(await analysis.json());
  stubReplay([options.decisionStep ?? { capture: loadCapture("s5-decision.json") }]);
  const decided = await call(decisionRoute, caseId);
  expect(decided.status).toBe(200);
  decisionResponseSchema.parse(await decided.json());
  return caseId;
}

function userMessage(text: string, id: string = crypto.randomUUID()): { id: string; role: "user"; parts: { type: "text"; text: string }[] } {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function chatRequest(caseId: string, message: unknown, trigger: string = "submit-message"): Promise<Response> {
  return chatRoute(
    new Request(`http://localhost/api/cases/${caseId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, trigger }),
    }),
    { params: Promise.resolve({ caseId }) },
  );
}

const chunkSchema = z.looseObject({ type: z.string() });
type SseChunk = z.infer<typeof chunkSchema>;

/** Reads the whole body with a hard deadline so a stream that never closes fails the test instead of hanging. */
async function readText(res: Response, ms = 8_000): Promise<string> {
  const timer = new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new Error("stream did not close in time")), ms).unref();
  });
  return Promise.race([res.text(), timer]);
}

async function readChunks(res: Response): Promise<SseChunk[]> {
  const text = await readText(res);
  return text
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.startsWith("data: ") && block !== "data: [DONE]")
    .map((block) => chunkSchema.parse(JSON.parse(block.slice("data: ".length))));
}

async function errorOf(res: Response): Promise<{ text: string; code: string; message: string }> {
  const text = await res.text();
  const body = apiErrorBodySchema.parse(JSON.parse(text));
  return { text, code: body.error.code, message: body.error.message };
}

function firstRequestText(): string {
  return JSON.stringify(replay.calls[0]?.body);
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

describe("POST /api/cases/{id}/chat", () => {
  it("scenario 9: sends policy, purchase date, findings, decision and history; streams text; stores both messages", async () => {
    const caseId = await prepareDecided();
    stubReplay(refusedSteps);
    const message = userMessage(QUESTION);
    const res = await chatRequest(caseId, message);
    expect(res.status).toBe(200);
    const chunks = await readChunks(res);
    const types = chunks.map((c) => c.type);
    expect(types[0]).toBe("start");
    expect(types).toContain("text-delta");
    expect(types.at(-1)).toBe("finish");
    expect(types.some((t) => t.startsWith("reasoning") || t.startsWith("tool-"))).toBe(false);

    const request = firstRequestText();
    expect(request).toContain("R1.1");
    expect(request).toContain("20.11.2026");
    expect(request).toContain("categoryMatch");
    expect(request).toContain(QUESTION);
    expect(request).toContain("reject");

    const stored = getCaseRepository().get(caseId);
    expect(stored?.chatBusy).toBe(false);
    expect(stored?.messages.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
    expect(stored?.decisionHistory).toHaveLength(1);
  });

  it("scenario 11: failed first request clears the lock; regenerate with the same id stores the user message once", async () => {
    const caseId = await prepareDecided();
    const message = userMessage(QUESTION);
    stubReplay([{ capture: loadCapture("s6-chat-401.json") }]);
    const failed = await chatRequest(caseId, message);
    expect(failed.status).toBe(200);
    const text = await readText(failed);
    expect(text).toContain(pl.chat.error);
    expect(text).not.toMatch(/401|api key|openrouter|unauthorized/i);
    const afterFailure = getCaseRepository().get(caseId);
    expect(afterFailure?.chatBusy).toBe(false);
    expect(afterFailure?.messages.map((m) => m.role)).toEqual(["assistant", "user"]);

    stubReplay(refusedSteps);
    const retried = await chatRequest(caseId, message, "regenerate-message");
    expect(retried.status).toBe(200);
    expect((await readChunks(retried)).map((c) => c.type)).toContain("text-delta");
    expect(replay.calls.length).toBeGreaterThan(0);
    const stored = getCaseRepository().get(caseId);
    expect(stored?.messages.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
    expect(stored?.chatBusy).toBe(false);
  });

  it("scenario 12: a second request while the first streams -> 409 CASE_STATE with the busy message", async () => {
    const caseId = await prepareDecided();
    stubFetch(hangingFetch());
    const controller = new AbortController();
    const first = await chatCase(caseId, { message: userMessage(QUESTION), trigger: "submit-message" }, { signal: controller.signal });
    expect(first.status).toBe(200);
    expect(getCaseRepository().get(caseId)?.chatBusy).toBe(true);

    const second = await chatRequest(caseId, userMessage("Druga wiadomość"));
    expect(second.status).toBe(409);
    const err = await errorOf(second);
    expect(err.code).toBe("CASE_STATE");
    expect(err.message).toBe(pl.chat.busy);

    controller.abort();
    await readText(first).catch(() => "");
    await vi.waitFor(() => expect(getCaseRepository().get(caseId)?.chatBusy).toBe(false));
  });

  it("scenario 10: accepted update (derived approve, manual_review in period) streams data-decision first and stores chat_update", async () => {
    const caseId = await prepareDecided({
      fields: COMPLAINT,
      screening: "s1-complaint-deny.json",
      decisionStep: withContent(loadCapture("s5-decision.json"), { decision: "manual_review", citedRules: ["C4.3"] }),
    });
    expect(getCaseRepository().get(caseId)?.decision?.decision).toBe("manual_review");
    stubReplay(acceptedSteps);
    const res = await chatRequest(caseId, userMessage(QUESTION));
    expect(res.status).toBe(200);
    const types = (await readChunks(res)).map((c) => c.type);
    const decisionAt = types.indexOf("data-decision");
    expect(decisionAt).toBeGreaterThan(-1);
    expect(decisionAt).toBeLessThan(types.indexOf("text-delta"));
    const stored = getCaseRepository().get(caseId);
    expect(stored?.decision).toMatchObject({ decision: "approve", origin: "chat_update" });
    expect(stored?.decisionHistory).toHaveLength(2);
    expect(stored?.chatBusy).toBe(false);
  });

  it("scenario 10b: derived approve on a date-rejected case is refused, decision unchanged", async () => {
    const caseId = await prepareDecided({
      fields: { ...COMPLAINT, purchaseDate: "2024-01-01" },
      screening: "s1-complaint-deny.json",
      decisionStep: withContent(loadCapture("s5-decision.json"), { decision: "reject", citedRules: ["C1.1"] }),
    });
    stubReplay(acceptedSteps);
    const res = await chatRequest(caseId, userMessage(QUESTION));
    const types = (await readChunks(res)).map((c) => c.type);
    expect(types).not.toContain("data-decision");
    const stored = getCaseRepository().get(caseId);
    expect(stored?.decision?.decision).toBe("reject");
    expect(stored?.decisionHistory).toHaveLength(1);
  });

  it("scenario 12: a stale lock (older than 90 s) is released and the request proceeds", async () => {
    const caseId = await prepareDecided();
    getCaseRepository().update(caseId, (c) => ({ ...c, chatBusy: true, chatBusySince: new Date(NOW.getTime() - 120_000).toISOString() }));
    stubReplay(refusedSteps);
    const res = await chatCase(caseId, { message: userMessage(QUESTION), trigger: "submit-message" }, { now: () => NOW });
    expect(res.status).toBe(200);
    await readChunks(res);
    expect(getCaseRepository().get(caseId)?.chatBusy).toBe(false);
  });

  it("scenario 12: a fresh lock (30 s) -> 409", async () => {
    const caseId = await prepareDecided();
    getCaseRepository().update(caseId, (c) => ({ ...c, chatBusy: true, chatBusySince: new Date(NOW.getTime() - 30_000).toISOString() }));
    stubReplay([]);
    await expect(chatCase(caseId, { message: userMessage(QUESTION), trigger: "submit-message" }, { now: () => NOW })).rejects.toMatchObject({ code: "CASE_STATE", status: 409 });
    expect(replay.calls).toHaveLength(0);
  });

  it("scenario 12: /chat before /decision -> 409 CASE_STATE, no AI call", async () => {
    const created = await createRoute(buildCreateRequest(VALID_FIELDS, examplePhoto("phone-1.jpg", "image/jpeg")));
    const caseId = createCaseResponseSchema.parse(await created.json()).caseId;
    stubReplay([]);
    const res = await chatRequest(caseId, userMessage(QUESTION));
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("CASE_STATE");
    expect(replay.calls).toHaveLength(0);
  });

  it("scenario 12: unknown case -> 404 CASE_NOT_FOUND", async () => {
    stubReplay([]);
    const res = await chatRequest("2b9a8f64-4a2a-4a37-9d2a-3a5e9a1b0c11", userMessage(QUESTION));
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("CASE_NOT_FOUND");
  });

  it("rejects file parts, empty text and 2001 characters with 422 VALIDATION_FAILED in Polish; accepts 2000", async () => {
    const caseId = await prepareDecided();
    stubReplay(refusedSteps);
    const withFile = { id: crypto.randomUUID(), role: "user", parts: [{ type: "file", mediaType: "image/png", url: "data:image/png;base64,AAAA" }] };
    const bad: unknown[] = [withFile, userMessage("   "), userMessage("a".repeat(2001)), { ...userMessage(QUESTION), role: "assistant" }];
    for (const message of bad) {
      const res = await chatRequest(caseId, message);
      expect(res.status).toBe(422);
      const err = await errorOf(res);
      expect(err.code).toBe("VALIDATION_FAILED");
      expect(err.message).toMatch(/[ąćęłńóśźż]|Nie|Popraw/);
    }
    expect(replay.calls).toHaveLength(0);
    expect(getCaseRepository().get(caseId)?.chatBusy).toBe(false);
    expect(getCaseRepository().get(caseId)?.messages).toHaveLength(1);
    const ok = await chatRequest(caseId, userMessage("a".repeat(2000)));
    expect(ok.status).toBe(200);
    await readChunks(ok);
  });

  it("invalid JSON body -> 422", async () => {
    const caseId = await prepareDecided();
    const res = await chatRoute(new Request("http://localhost/x", { method: "POST", body: "{nope" }), { params: Promise.resolve({ caseId }) });
    expect(res.status).toBe(422);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });

  it("a message id that already has an assistant reply -> 409, nothing appended", async () => {
    const caseId = await prepareDecided();
    stubReplay(refusedSteps);
    const message = userMessage(QUESTION);
    await readChunks(await chatRequest(caseId, message));
    const before = getCaseRepository().get(caseId)?.messages.length;
    stubReplay([]);
    const res = await chatRequest(caseId, message, "regenerate-message");
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("CASE_STATE");
    expect(replay.calls).toHaveLength(0);
    expect(getCaseRepository().get(caseId)?.messages).toHaveLength(before ?? -1);
    expect(getCaseRepository().get(caseId)?.chatBusy).toBe(false);
  });
});
