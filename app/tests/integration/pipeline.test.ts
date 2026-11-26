import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  analysisResponseSchema,
  apiErrorBodySchema,
  createCaseResponseSchema,
  decisionResponseSchema,
} from "@/lib/schemas";
import { POST as createRoute } from "@/app/api/cases/route";
import { POST as analysisRoute } from "@/app/api/cases/[caseId]/analysis/route";
import { POST as decisionRoute } from "@/app/api/cases/[caseId]/decision/route";
import { POST as chatRoute } from "@/app/api/cases/[caseId]/chat/route";
import { resetModelRegistryForTests } from "@/server/ai/models";
import { resetConfigForTests } from "@/server/config";
import { getCaseRepository, InMemoryCaseRepository } from "@/server/cases/repository";

import { loadCapture, replayFetch, type ReplayFetch } from "../support/replay-fetch";
import { buildCreateRequest, examplePhoto, setupTestEnv, VALID_FIELDS } from "./helpers";

// Raw captures only (TR4): s1-return-deny (screening), s2-image-findings (vision, escalation always),
// s5-decision, s5-chat-stream + s5-chat-followup-refused. Only the OpenRouter HTTP calls are replayed.

let replay: ReplayFetch;
function stubReplay(files: readonly string[]): void {
  replay = replayFetch(files.map((file) => ({ capture: loadCapture(file) })));
  vi.stubGlobal("fetch", replay.fetch);
}

type Route = typeof analysisRoute;
function call(route: Route, caseId: string, init: RequestInit = { method: "POST" }): Promise<Response> {
  return route(new Request(`http://localhost/api/cases/${caseId}/x`, init), { params: Promise.resolve({ caseId }) });
}

const chunkSchema = z.looseObject({ type: z.string() });
async function readChunks(res: Response): Promise<string[]> {
  const timer = new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new Error("stream did not close in time")), 8_000).unref();
  });
  const text = await Promise.race([res.text(), timer]);
  return text
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.startsWith("data: ") && block !== "data: [DONE]")
    .map((block) => chunkSchema.parse(JSON.parse(block.slice("data: ".length))).type);
}

async function expectNotFound(res: Response): Promise<void> {
  expect(res.status).toBe(404);
  expect(apiErrorBodySchema.parse(await res.json()).error.code).toBe("CASE_NOT_FOUND");
}

beforeEach(() => {
  setupTestEnv();
  resetModelRegistryForTests();
  process.env.ANALYSIS_ESCALATION = "always";
  resetConfigForTests();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.ANALYSIS_ESCALATION;
  resetConfigForTests();
  resetModelRegistryForTests();
});

describe("full pipeline through the real route handlers", () => {
  it("create -> analysis -> decision -> chat, then TTL expiry -> 404 CASE_NOT_FOUND on all four endpoints (TAC-003-05)", async () => {
    // A repository on a fake clock, installed in the same global slot the handlers use.
    let nowMs = Date.now();
    const repo = new InMemoryCaseRepository({ ttlMinutes: 60, maxCases: 10, now: () => new Date(nowMs) });
    globalThis.__hsdcCaseRepository = repo;

    const created = await createRoute(buildCreateRequest(VALID_FIELDS, examplePhoto("phone-1.jpg", "image/jpeg")));
    expect(created.status).toBe(201);
    const { caseId } = createCaseResponseSchema.parse(await created.json());

    stubReplay(["s1-return-deny.json", "s2-image-findings.json"]);
    const analysis = await call(analysisRoute, caseId);
    expect(analysis.status).toBe(200);
    expect(analysisResponseSchema.parse(await analysis.json()).status).toBe("analyzed");
    expect(replay.calls).toHaveLength(2);

    stubReplay(["s5-decision.json"]);
    const decided = await call(decisionRoute, caseId);
    expect(decided.status).toBe(200);
    const decision = decisionResponseSchema.parse(await decided.json());
    expect(decision.status).toBe("decided");
    const first = z.looseObject({ parts: z.array(z.looseObject({ type: z.string() })) }).parse(decision.firstMessage);
    expect(first.parts.map((p) => p.type)).toEqual(["text", "data-decision", "text", "text", "text"]);

    stubReplay(["s5-chat-stream.json", "s5-chat-followup-refused.json"]);
    const chat = await call(chatRoute, caseId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: "Czy mogę jeszcze coś zrobić?" }] },
        trigger: "submit-message",
      }),
    });
    expect(chat.status).toBe(200);
    const types = await readChunks(chat);
    expect(types[0]).toBe("start");
    expect(types).toContain("text-delta");
    expect(types.at(-1)).toBe("finish");
    expect(getCaseRepository().get(caseId)?.messages).toHaveLength(3);

    // TAC-003-05: past the TTL every endpoint answers 404.
    nowMs += 61 * 60_000;
    stubReplay([]);
    const chatBody = JSON.stringify({
      message: { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: "Jeszcze jedno pytanie" }] },
      trigger: "submit-message",
    });
    await expectNotFound(await call(analysisRoute, caseId));
    await expectNotFound(await call(decisionRoute, caseId));
    await expectNotFound(await call(chatRoute, caseId, { method: "POST", body: chatBody }));
    expect(repo.get(caseId)).toBeNull();
    expect(replay.calls).toHaveLength(0);
  });
});
