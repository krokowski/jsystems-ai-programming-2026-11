import "server-only";

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { screeningResultSchema } from "@/lib/schemas/domain";
import type { ScreeningArea } from "@/lib/schemas/domain";
import type { CaseForm } from "@/lib/schemas/case-form";
import { parseConfig, type AppConfig } from "@/server/config";
import { createModelRegistry } from "@/server/ai/models";

import {
  captureBody,
  hangingFetch,
  loadCapture,
  replayFetch,
  type ReplayFetch,
} from "../../../../tests/support/replay-fetch";
import { createLunaDecisionsScreening } from "./luna-decisions";
import { requiredScreeningKeys } from "./escalation";

// Source captures (A23, Jev): s1-jev-return.json, s1-jev-complaint.json (200).
// Old Luna capture s1-return-deny.json is kept only for the A22 fallback test (noul without confidence).
// Errors: s6-decisions-401.json (401), s6-decisions-400-unknown-model.json (400).
const returnCapture = loadCapture("s1-jev-return.json");
const complaintCapture = loadCapture("s1-jev-complaint.json");
const lunaReturnCapture = loadCapture("s1-return-deny.json");
const unauthorized = loadCapture("s6-decisions-401.json");
const unknownModel = loadCapture("s6-decisions-400-unknown-model.json");

function config(extra: Record<string, string> = {}): AppConfig {
  return parseConfig({ OPENROUTER_API_KEY: "test-key", LLM_MODEL: "vendor/llm", ...extra });
}

const returnForm: CaseForm = {
  caseType: "return",
  category: "smartphone",
  productName: "Galaxy S24",
  purchaseDate: "2026-11-23",
  reason: "",
};
const complaintForm: CaseForm = {
  caseType: "complaint",
  category: "laptop",
  productName: "ThinkPad X1",
  purchaseDate: "2026-06-01",
  reason: "Zawias pękł podczas zwykłego otwierania laptopa.",
};
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]);
const CASE_ID = "a5d2d30f-7c64-4e83-9e09-8e6d59b4bc4d";

const bodySchema = z.looseObject({ answers: z.record(z.string(), z.record(z.string(), z.unknown())) });
type DecisionsBody = z.infer<typeof bodySchema>;

const requestSchema = z.looseObject({
  model: z.string(),
  state: z.tuple([z.string(), z.object({ type: z.string(), image_url: z.object({ url: z.string() }) })]),
  questions: z.record(z.string(), z.unknown()),
  session_id: z.string(),
  provider: z.unknown(),
});
const questionsOnly = z.looseObject({ questions: z.record(z.string(), z.unknown()) });
const logEntrySchema = z.record(z.string(), z.unknown());

function derivedBody(capture: typeof returnCapture, edit: (body: DecisionsBody) => void): DecisionsBody {
  const body = bodySchema.parse(captureBody(capture));
  edit(body);
  return body;
}

function screening(replay: ReplayFetch, cfg: AppConfig = config(), extra: { timeoutMs?: number } = {}) {
  const registry = createModelRegistry({ config: cfg, fetch: replay.fetch });
  return createLunaDecisionsScreening({ registry, config: cfg, ...extra });
}

function area(result: { areas: ScreeningArea[] }, key: string): ScreeningArea {
  const found = result.areas.find((a) => a.key === key);
  if (!found) throw new Error(`no area ${key}`);
  return found;
}

afterEach(() => vi.restoreAllMocks());

describe("return capture (s1-jev-return.json)", () => {
  it("maps noul/score answers (A22 fallback: Jev noul carries no confidence) and stays schema-valid", async () => {
    const replay = replayFetch([{ capture: returnCapture }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });

    expect(screeningResultSchema.safeParse(result).success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.model).toBe("typesafe/jev-1.14-20261014");
    expect(result.promptVersion).toBe("2026-11-26.1");
    expect(result.areas.map((a) => a.key)).toEqual([...requiredScreeningKeys("return")]);

    expect(area(result, "photo_usable")).toMatchObject({
      type: "noul", value: true, confidence: 0.76, certain: false, refused: false,
    });
    expect(area(result, "photo_usable").probabilities).toEqual({ true: 0.76, false: 0.24 });
    expect(area(result, "category_match")).toMatchObject({ value: true, confidence: 0.98, certain: true });
    expect(area(result, "damage_visible")).toMatchObject({ value: true, confidence: 0.98, certain: true });
    expect(area(result, "signs_of_use")).toMatchObject({ value: true, confidence: 0.7, certain: false });
    // Jev returns a fractional score (3.95); the adapter rounds it to the bucket index.
    expect(area(result, "condition")).toMatchObject({ type: "score", value: 4, confidence: 0.98, certain: true });
    expect(area(result, "condition").probabilities).toEqual({ "0": 0, "1": 0, "2": 0, "3": 0.03, "4": 0.97 });

    expect(result.allCertain).toBe(false);
    expect(result.uncertainKeys).toEqual(["photo_usable", "signs_of_use"]);
    // BYOK: usage.cost is 0, the real price is cost_details.upstream_inference_cost (A22).
    expect(result.costCredits).toBe(0.000140616);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("Luna capture (s1-return-deny.json, history): noul without confidence still maps via the A22 fallback", async () => {
    const replay = replayFetch([{ capture: lunaReturnCapture }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(result.error).toBeNull();
    expect(result.model).toBe("openai/gpt-6-luna-decisions-20261006");
    expect(area(result, "photo_usable")).toMatchObject({ value: true, confidence: 0.94, certain: true });
    expect(area(result, "category_match")).toMatchObject({ value: false, confidence: 0.9, certain: true });
    expect(area(result, "condition")).toMatchObject({ value: 4, confidence: 1, certain: true });
    expect(result.allCertain).toBe(true);
    expect(result.costCredits).toBe(0.0001906);
  });

  it("sends the S1 request structure to the Decisions endpoint", async () => {
    const replay = replayFetch([{ capture: returnCapture }]);
    await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });

    expect(replay.calls).toHaveLength(1);
    const call = replay.calls[0];
    expect(call?.url).toBe("https://openrouter.ai/api/alpha/decisions");
    expect(call?.method).toBe("POST");
    const sent = requestSchema.parse(call?.body);
    const captured = requestSchema.parse(returnCapture.request);
    expect(Object.keys(sent).sort()).toEqual(Object.keys(captured).sort());
    expect(sent.model).toBe("typesafe/jev-1.14");
    expect(sent.session_id).toBe(CASE_ID);
    expect(sent.provider).toEqual({ data_collection: "deny" });
    expect(sent.state).toHaveLength(2);
    expect(typeof sent.state[0]).toBe("string");
    expect(sent.state[1].type).toBe("image_url");
    expect(sent.state[1].image_url.url).toBe(`data:image/jpeg;base64,${jpeg.toString("base64")}`);
    expect(sent.state[1].image_url.url.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(sent.questions).toEqual(captured.questions);
    expect(sent.state[0]).toBe(captured.state[0]);
  });

  it("uses the 'an electronic device' wording for category other", async () => {
    const replay = replayFetch([{ capture: returnCapture }]);
    await screening(replay).screen({
      caseId: CASE_ID, caseType: "return", form: { ...returnForm, category: "other" }, jpeg,
    });
    const sent = requestSchema.parse(replay.calls[0]?.body);
    expect(sent.questions.category_match).toEqual({ type: "noul", instructions: "The product in the photo is an electronic device." });
    expect(sent.state[0]).toContain("other (Inne)");
  });

  it("logs one stage line with typed fields only (no free text, no image data)", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    const replay = replayFetch([{ capture: returnCapture }]);
    await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(lines).toHaveLength(1);
    const entry = logEntrySchema.parse(JSON.parse(lines[0] ?? "{}"));
    expect(entry).toMatchObject({
      stage: "screening", caseId: CASE_ID, status: "ok", model: "typesafe/jev-1.14-20261014",
      promptVersion: "2026-11-26.1", costCredits: 0.000140616,
    });
    expect(lines[0]).not.toContain("Galaxy");
    expect(lines[0]).not.toContain("base64");
  });
});

describe("certainty threshold (derived from s1-jev-complaint.json / s1-jev-return.json)", () => {
  it("complaint capture: photo_usable 0.42 gives confidence 0.58, uncertain; damage_cause 0.87 is certain", async () => {
    const replay = replayFetch([{ capture: complaintCapture }]);
    const result = await screening(replay).screen({
      caseId: CASE_ID, caseType: "complaint", form: complaintForm, jpeg,
    });
    expect(result.areas.map((a) => a.key)).toEqual([...requiredScreeningKeys("complaint")]);
    expect(area(result, "photo_usable")).toMatchObject({ value: false, confidence: 0.58, certain: false });
    expect(area(result, "category_match")).toMatchObject({ value: true, confidence: 0.95, certain: true });
    expect(area(result, "damage_type")).toMatchObject({ type: "choice", value: "screen_crack", confidence: 0.98, certain: true });
    expect(area(result, "damage_type").probabilities).toMatchObject({ screen_crack: 0.98, scratches: 0 });
    expect(area(result, "damage_cause")).toMatchObject({ value: "mechanical_impact", confidence: 0.87, certain: true });
    expect(area(result, "description_consistent")).toMatchObject({ value: false, confidence: 0.88, certain: true });
    expect(result.allCertain).toBe(false);
    expect(result.uncertainKeys).toEqual(["photo_usable"]);
    expect(result.costCredits).toBe(0.00029085);
  });

  it("complaint capture request carries the reason in a customer_data block and the complaint question set", async () => {
    const replay = replayFetch([{ capture: complaintCapture }]);
    await screening(replay).screen({ caseId: CASE_ID, caseType: "complaint", form: complaintForm, jpeg });
    const sent = requestSchema.parse(replay.calls[0]?.body);
    expect(sent.state[0]).toContain('<customer_data label="reason">');
    expect(sent.state[0]).toContain("Zawias pękł");
    const captured = questionsOnly.parse(complaintCapture.request);
    expect(sent.questions).toEqual(captured.questions);
  });

  it("0.2 (derived from 0.42) lands exactly on the 0.80 boundary and is certain; 0.21 is not", async () => {
    const at = derivedBody(complaintCapture, (b) => {
      b.answers.photo_usable = { type: "noul", noul: 0.2 };
    });
    const below = derivedBody(complaintCapture, (b) => {
      b.answers.photo_usable = { type: "noul", noul: 0.21 };
    });
    const input = { caseId: CASE_ID, caseType: "complaint", form: complaintForm, jpeg } as const;
    const r1 = await screening(replayFetch([{ capture: complaintCapture, body: at }])).screen(input);
    expect(area(r1, "photo_usable")).toMatchObject({ value: false, confidence: 0.8, certain: true });
    const r2 = await screening(replayFetch([{ capture: complaintCapture, body: below }])).screen(input);
    expect(area(r2, "photo_usable")).toMatchObject({ value: false, confidence: 0.79, certain: false });
  });

  it("threshold 0.9 from config makes 0.87 (damage_cause) and 0.88 (description_consistent) uncertain while 0.95 stays certain", async () => {
    const replay = replayFetch([{ capture: complaintCapture }]);
    const result = await screening(replay, config({ SCREENING_CONFIDENCE_THRESHOLD: "0.9" })).screen({
      caseId: CASE_ID, caseType: "complaint", form: complaintForm, jpeg,
    });
    expect(area(result, "category_match").certain).toBe(true);
    expect(area(result, "damage_cause")).toMatchObject({ confidence: 0.87, certain: false });
    expect(area(result, "description_consistent")).toMatchObject({ confidence: 0.88, certain: false });
    expect(result.uncertainKeys).toEqual(["photo_usable", "damage_cause", "description_consistent"]);
    expect(result.allCertain).toBe(false);
  });

  it("uses the API confidence for score answers (derived 0.7 is uncertain)", async () => {
    const body = derivedBody(returnCapture, (b) => {
      const cond = b.answers.condition;
      if (cond) cond.confidence = 0.7;
    });
    const replay = replayFetch([{ capture: returnCapture, body }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(area(result, "condition")).toMatchObject({ value: 4, confidence: 0.7, certain: false });
  });
});

describe("answers that are not usable", () => {
  it("one captured answer removed -> that key is refused and not certain", async () => {
    const body = derivedBody(returnCapture, (b) => {
      delete b.answers.damage_visible;
    });
    const replay = replayFetch([{ capture: returnCapture, body }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(area(result, "damage_visible")).toMatchObject({
      type: "noul", value: null, probabilities: null, confidence: null, certain: false, refused: true,
    });
    expect(result.uncertainKeys).toEqual(["photo_usable", "damage_visible", "signs_of_use"]); // the other two are 0.76 / 0.7 in the Jev capture
    expect(result.allCertain).toBe(false);
    expect(result.error).toBeNull();
    expect(result.areas).toHaveLength(5);
  });

  it("an answer of an unexpected type is refused (also covers the documented refusal answer)", async () => {
    const body = derivedBody(returnCapture, (b) => {
      const cond = b.answers.condition;
      if (cond) cond.type = "noul";
    });
    const replay = replayFetch([{ capture: returnCapture, body }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(area(result, "condition")).toMatchObject({ type: "score", value: null, certain: false, refused: true });
  });

  it("a choice outside the asked keys is refused", async () => {
    const body = derivedBody(complaintCapture, (b) => {
      const dt = b.answers.damage_type;
      if (dt) dt.choice = "exploded";
    });
    const replay = replayFetch([{ capture: complaintCapture, body }]);
    const result = await screening(replay).screen({
      caseId: CASE_ID, caseType: "complaint", form: complaintForm, jpeg,
    });
    expect(area(result, "damage_type")).toMatchObject({ refused: true, certain: false, value: null });
  });
});

describe("failures never throw", () => {
  it("401 capture -> error.kind http with status 401, no areas", async () => {
    const replay = replayFetch([{ capture: unauthorized }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(result.error).toEqual({ kind: "http", status: 401 });
    expect(result.areas).toEqual([]);
    expect(result.allCertain).toBe(false);
    expect(result.costCredits).toBeNull();
    expect(screeningResultSchema.safeParse(result).success).toBe(true);
  });

  it("400 unknown model capture -> error.kind http with status 400", async () => {
    const replay = replayFetch([{ capture: unknownModel }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(result.error).toEqual({ kind: "http", status: 400 });
  });

  it("hanging fetch with a short budget -> error.kind timeout", async () => {
    const replay = hangingFetch();
    const result = await screening(replay, config(), { timeoutMs: 40 }).screen({
      caseId: CASE_ID, caseType: "return", form: returnForm, jpeg,
    });
    expect(result.error).toEqual({ kind: "timeout" });
    expect(result.areas).toEqual([]);
    expect(result.allCertain).toBe(false);
    expect(replay.calls).toHaveLength(1);
  });

  it("caller abort signal also stops the call without throwing", async () => {
    const replay = hangingFetch();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    const result = await screening(replay).screen({
      caseId: CASE_ID, caseType: "return", form: returnForm, jpeg, signal: controller.signal,
    });
    expect(result.error?.kind).toBe("timeout");
  });

  it("non-JSON 200 body -> error.kind parse", async () => {
    const replay = replayFetch([{ capture: returnCapture, rawText: "<html>not json</html>" }]);
    const result = await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    expect(result.error).toEqual({ kind: "parse" });
    expect(result.areas).toEqual([]);
  });

  it("a network failure (fetch rejects) -> error.kind http without status", async () => {
    const failing: typeof fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const cfg = config();
    const registry = createModelRegistry({ config: cfg, fetch: failing });
    const result = await createLunaDecisionsScreening({ registry, config: cfg }).screen({
      caseId: CASE_ID, caseType: "return", form: returnForm, jpeg,
    });
    expect(result.error).toEqual({ kind: "http" });
  });

  it("logs an error line with errorKind and no free text", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    const replay = replayFetch([{ capture: unauthorized }]);
    await screening(replay).screen({ caseId: CASE_ID, caseType: "return", form: returnForm, jpeg });
    const entry = logEntrySchema.parse(JSON.parse(lines[0] ?? "{}"));
    expect(entry).toMatchObject({ stage: "screening", status: "error", errorKind: "http" });
    expect(lines[0]).not.toContain("Missing Authentication");
  });
});
