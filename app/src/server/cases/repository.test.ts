import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CaseForm, DateRuleResult } from "@/lib/schemas";

import { resetConfigForTests } from "../config";

import {
  type Case,
  type CaseRepository,
  getCaseRepository,
  InMemoryCaseRepository,
  resetCaseRepositoryForTests,
  type StoredImage,
} from "./repository";

const START = new Date("2026-11-26T10:00:00.000Z");
const TTL_MINUTES = 10;
const MINUTE_MS = 60_000;

let clock: Date;
const now = (): Date => clock;
const advanceMinutes = (minutes: number): void => {
  clock = new Date(clock.getTime() + minutes * MINUTE_MS);
};

const image: StoredImage = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  width: 1,
  height: 1,
  originalMime: "image/jpeg",
  originalBytes: 3,
};

const form: CaseForm = {
  caseType: "return",
  category: "smartphone",
  productName: "Testowy telefon",
  purchaseDate: "2026-11-12",
  reason: "",
};

const dateRule: DateRuleResult = {
  caseType: "return",
  purchaseDate: "2026-11-12",
  referenceDate: "2026-11-26",
  daysSincePurchase: 14,
  withinPeriod: true,
  ruleId: "R1.1",
  deadline: "2026-11-26",
  withinCosmeticWindow: null,
};

function fixture(id: string): Omit<Case, "createdAt" | "expiresAt"> {
  return {
    id,
    status: "created",
    form,
    image,
    thumbnailDataUrl: "data:image/jpeg;base64,AA==",
    dateRule,
    screening: null,
    findings: null,
    decision: null,
    decisionHistory: [],
    messages: [],
    chatBusy: false,
    chatBusySince: null,
  };
}

function newRepo(maxCases = 500): CaseRepository {
  return new InMemoryCaseRepository({ ttlMinutes: TTL_MINUTES, maxCases, now });
}

beforeEach(() => {
  clock = new Date(START);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetConfigForTests();
  resetCaseRepositoryForTests();
});

describe("InMemoryCaseRepository: create and get", () => {
  it("stores the case with createdAt and expiresAt derived from the clock and TTL", () => {
    const repo = newRepo();
    const created = repo.create(fixture("case-1"));
    expect(created.createdAt).toBe(START.toISOString());
    expect(created.expiresAt).toBe(new Date(START.getTime() + TTL_MINUTES * MINUTE_MS).toISOString());
    expect(repo.get("case-1")).toEqual(created);
  });

  it("returns the case before expiry", () => {
    const repo = newRepo();
    repo.create(fixture("case-1"));
    advanceMinutes(TTL_MINUTES - 1);
    expect(repo.get("case-1")).not.toBeNull();
  });

  it("returns null after expiry and deletes the expired entry", () => {
    const repo = newRepo();
    repo.create(fixture("case-1"));
    advanceMinutes(TTL_MINUTES);
    expect(repo.get("case-1")).toBeNull();
    expect(repo.size()).toBe(0);
  });

  it("returns null for an unknown id", () => {
    expect(newRepo().get("missing")).toBeNull();
  });
});

describe("InMemoryCaseRepository: update", () => {
  it("replaces the stored value using the patch function", () => {
    const repo = newRepo();
    repo.create(fixture("case-1"));
    const updated = repo.update("case-1", (c) => ({ ...c, status: "analyzed" }));
    expect(updated?.status).toBe("analyzed");
    expect(repo.get("case-1")?.status).toBe("analyzed");
  });

  it("does not refresh createdAt or expiresAt", () => {
    const repo = newRepo();
    const created = repo.create(fixture("case-1"));
    advanceMinutes(5);
    const updated = repo.update("case-1", (c) => ({ ...c, chatBusy: true }));
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.expiresAt).toBe(created.expiresAt);
  });

  it("returns null for an unknown id", () => {
    expect(newRepo().update("missing", (c) => c)).toBeNull();
  });

  it("returns null for an expired case", () => {
    const repo = newRepo();
    repo.create(fixture("case-1"));
    advanceMinutes(TTL_MINUTES);
    expect(repo.update("case-1", (c) => c)).toBeNull();
  });
});

describe("InMemoryCaseRepository: delete and size", () => {
  it("removes a case and reports the size", () => {
    const repo = newRepo();
    repo.create(fixture("case-1"));
    repo.create(fixture("case-2"));
    expect(repo.size()).toBe(2);
    repo.delete("case-1");
    expect(repo.get("case-1")).toBeNull();
    expect(repo.size()).toBe(1);
  });
});

describe("InMemoryCaseRepository: capacity", () => {
  it("evicts the oldest case when the 501st case is created with maxCases 500", () => {
    const repo = newRepo(500);
    for (let i = 1; i <= 500; i += 1) {
      repo.create(fixture(`case-${i}`));
    }
    expect(repo.size()).toBe(500);
    repo.create(fixture("case-501"));
    expect(repo.size()).toBe(500);
    expect(repo.get("case-1")).toBeNull();
    expect(repo.get("case-2")).not.toBeNull();
    expect(repo.get("case-501")).not.toBeNull();
  });
});

describe("getCaseRepository singleton", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test");
    vi.stubEnv("LLM_MODEL", "test/model");
    vi.stubEnv("CASE_TTL_MINUTES", String(TTL_MINUTES));
    resetConfigForTests();
    resetCaseRepositoryForTests();
  });

  it("returns the same instance on a second call and keeps stored cases", () => {
    const first = getCaseRepository();
    first.create(fixture("case-1"));
    const second = getCaseRepository();
    expect(second).toBe(first);
    expect(second.get("case-1")).not.toBeNull();
  });

  it("is stored on globalThis under __hsdcCaseRepository", () => {
    const repo = getCaseRepository();
    expect(globalThis.__hsdcCaseRepository).toBe(repo);
  });

  it("starts empty again after resetCaseRepositoryForTests", () => {
    getCaseRepository().create(fixture("case-1"));
    resetCaseRepositoryForTests();
    expect(getCaseRepository().get("case-1")).toBeNull();
  });
});
