import { beforeEach, describe, expect, it } from "vitest";

import { apiErrorBodySchema, createCaseResponseSchema } from "@/lib/schemas";
import { todayInAppZone } from "@/lib/time";
import { POST } from "@/app/api/cases/route";
import { getCaseRepository } from "@/server/cases/repository";
import { resetServiceStateForTests, runSingleFlight } from "@/server/cases/service";

import {
  buildCreateRequest,
  examplePhoto,
  readExamplePhoto,
  setupTestEnv,
  VALID_FIELDS,
  type CreateFields,
} from "./helpers";

const phone = () => examplePhoto("phone-1.jpg", "image/jpeg");

function tomorrowWarsaw(): string {
  return todayInAppZone(new Date(Date.now() + 36 * 3600 * 1000));
}

async function errorBody(res: Response) {
  const text = await res.text();
  return { text, body: apiErrorBodySchema.parse(JSON.parse(text)) };
}

beforeEach(() => {
  setupTestEnv();
});

describe("POST /api/cases: valid create", () => {
  it("creates a case from phone-1.jpg", async () => {
    const res = await POST(buildCreateRequest(VALID_FIELDS, phone()));
    expect(res.status).toBe(201);
    const body = createCaseResponseSchema.parse(await res.json());
    expect(body.summary).toMatchObject({
      caseType: "return",
      category: "smartphone",
      productName: "Galaxy S24",
      purchaseDate: "2026-11-20",
      decision: null,
      decisionLabel: null,
    });
    expect(body.summary.thumbnailDataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    const stored = getCaseRepository().get(body.caseId);
    expect(stored?.status).toBe("created");
    expect(stored?.dateRule).toBeDefined();
    expect(stored?.decision).toBeNull();
  });

  it.each([
    ["laptop-2.webp", "image/webp"],
    ["laptop-1.png", "image/png"],
  ])("accepts %s", async (name, type) => {
    const res = await POST(buildCreateRequest(VALID_FIELDS, examplePhoto(name, type)));
    expect(res.status).toBe(201);
  });

  it("accepts a return with empty reason and purchase date = today", async () => {
    const res = await POST(
      buildCreateRequest({ ...VALID_FIELDS, purchaseDate: todayInAppZone(new Date()) }, phone()),
    );
    expect(res.status).toBe(201);
  });

  it("creates laptop-1.png in under 1000 ms (TAC-06)", async () => {
    const photo = examplePhoto("laptop-1.png", "image/png");
    const request = buildCreateRequest(VALID_FIELDS, photo);
    const start = performance.now();
    const res = await POST(request);
    const elapsed = performance.now() - start;
    console.log(`laptop-1.png create: ${elapsed.toFixed(0)} ms`);
    expect(res.status).toBe(201);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("POST /api/cases: field validation", () => {
  const cases: Array<[string, CreateFields, string, string]> = [
    ["caseType", { ...VALID_FIELDS, caseType: undefined }, "caseType", "Wybierz rodzaj zgłoszenia."],
    ["category", { ...VALID_FIELDS, category: "phone" }, "category", "Wybierz kategorię sprzętu."],
    [
      "productName",
      { ...VALID_FIELDS, productName: "a" },
      "productName",
      "Nazwa produktu musi mieć od 2 do 100 znaków.",
    ],
    [
      "purchaseDate",
      { ...VALID_FIELDS, purchaseDate: tomorrowWarsaw() },
      "purchaseDate",
      "Data zakupu nie może być z przyszłości",
    ],
    [
      "reason",
      { ...VALID_FIELDS, caseType: "complaint", reason: "123456789" },
      "reason",
      "Opis usterki musi mieć co najmniej 10 znaków.",
    ],
  ];

  it.each(cases)("rejects invalid %s", async (_n, fields, key, message) => {
    const res = await POST(buildCreateRequest(fields, phone()));
    expect(res.status).toBe(422);
    const { text, body } = await errorBody(res);
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.fields).toEqual({ [key]: message });
    expect(text).not.toMatch(/zod|undefined|\binvalid\b|expected|required/i);
  });

  it("rejects a missing photo", async () => {
    const res = await POST(buildCreateRequest(VALID_FIELDS, null));
    expect(res.status).toBe(422);
    const { body } = await errorBody(res);
    expect(body.error.fields).toEqual({ photo: "Dodaj zdjęcie produktu." });
  });

  it("reports field and photo errors together", async () => {
    const res = await POST(buildCreateRequest({ ...VALID_FIELDS, productName: "a" }, null));
    const { body } = await errorBody(res);
    expect(Object.keys(body.error.fields ?? {}).sort()).toEqual(["photo", "productName"]);
  });
});

describe("POST /api/cases: photo errors", () => {
  it("rejects a file over 10 MiB", async () => {
    const bytes = new Uint8Array(10_485_761);
    bytes.set([0xff, 0xd8, 0xff, 0xe0]);
    const res = await POST(buildCreateRequest(VALID_FIELDS, { bytes, name: "big.jpg", type: "image/jpeg" }));
    expect(res.status).toBe(422);
    const { body } = await errorBody(res);
    expect(body.error.fields).toEqual({ photo: "Plik przekracza limit 10 MB" });
  });

  it("rejects a text file named photo.jpg", async () => {
    const bytes = new TextEncoder().encode("to nie jest zdjęcie");
    const res = await POST(buildCreateRequest(VALID_FIELDS, { bytes, name: "photo.jpg", type: "image/jpeg" }));
    expect(res.status).toBe(422);
    const { body } = await errorBody(res);
    expect(body.error.fields).toEqual({ photo: "Dozwolone formaty: JPEG, PNG, WebP" });
  });

  it("rejects a truncated JPEG", async () => {
    const bytes = readExamplePhoto("phone-1.jpg").subarray(0, 2000);
    const res = await POST(buildCreateRequest(VALID_FIELDS, { bytes, name: "p.jpg", type: "image/jpeg" }));
    expect(res.status).toBe(422);
    const { body } = await errorBody(res);
    expect(body.error.fields).toEqual({ photo: "Dozwolone formaty: JPEG, PNG, WebP" });
  });
});

describe("POST /api/cases: payload limit", () => {
  it("returns 413 when content-length exceeds 11 MiB", async () => {
    const request = buildCreateRequest(VALID_FIELDS, phone(), { "content-length": "12582912" });
    console.log("content-length seen by handler:", request.headers.get("content-length"));
    const res = await POST(request);
    expect(res.status).toBe(413);
    const { body } = await errorBody(res);
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.error.message).toBe("Plik przekracza limit 10 MB");
  });
});

describe("runSingleFlight", () => {
  beforeEach(() => resetServiceStateForTests());

  it("runs work once for concurrent calls with the same key", async () => {
    let runs = 0;
    const work = async (): Promise<number> => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
      return runs;
    };
    const [a, b] = await Promise.all([
      runSingleFlight("c1", "analysis", work),
      runSingleFlight("c1", "analysis", work),
    ]);
    expect(runs).toBe(1);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it("propagates a rejection to both callers", async () => {
    const work = async (): Promise<number> => {
      await new Promise((r) => setTimeout(r, 10));
      throw new Error("boom");
    };
    const results = await Promise.allSettled([
      runSingleFlight("c2", "decision", work),
      runSingleFlight("c2", "decision", work),
    ]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
  });

  it("runs again after settling and keeps stages separate", async () => {
    let runs = 0;
    const work = async (): Promise<number> => ++runs;
    await runSingleFlight("c3", "analysis", work);
    await runSingleFlight("c3", "analysis", work);
    expect(runs).toBe(2);
    const slow = (): Promise<string> => new Promise((r) => setTimeout(() => r("x"), 10));
    const [x, y] = await Promise.all([
      runSingleFlight("c3", "analysis", slow),
      runSingleFlight("c3", "decision", slow),
    ]);
    expect([x, y]).toEqual(["x", "x"]);
  });
});
