import { describe, expect, it } from "vitest";
import { decisionRecordSchema, imageFindingsSchema } from "./domain";

const findings = {
  source: "llm",
  photoUsable: true,
  usabilityIssue: null,
  categoryMatch: true,
  damageVisible: false,
  damageType: "none_visible",
  damageLocation: null,
  likelyCause: "no_visible_damage",
  signsOfUse: null,
  resellable: null,
  conditionScore: 3,
  descriptionConsistent: null,
  screeningDisagreements: [],
  notes: "",
};

const initial = {
  origin: "initial",
  decision: "approve",
  citedRules: ["R1.1"],
  forcedBy: null,
  createdAt: "2026-11-26T10:00:00.000Z",
  greeting: "Dzień dobry",
  justification: "ok",
  nextSteps: ["a"],
  modelDecision: "approve",
};

describe("imageFindingsSchema", () => {
  it("accepts signsOfUse null", () => {
    expect(imageFindingsSchema.safeParse(findings).success).toBe(true);
  });
  it("rejects unusable photo without issue", () => {
    const r = imageFindingsSchema.safeParse({ ...findings, photoUsable: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["usabilityIssue"]);
    expect(imageFindingsSchema.safeParse({ ...findings, photoUsable: false, usabilityIssue: "blurry" }).success).toBe(true);
  });
  it("rejects conditionScore out of range", () => {
    expect(imageFindingsSchema.safeParse({ ...findings, conditionScore: 5 }).success).toBe(false);
  });
});

describe("decisionRecordSchema", () => {
  it("accepts initial and chat_update", () => {
    expect(decisionRecordSchema.safeParse(initial).success).toBe(true);
    expect(
      decisionRecordSchema.safeParse({
        origin: "chat_update", decision: "reject", citedRules: ["R2.1"], forcedBy: null,
        createdAt: "2026-11-26T10:00:00.000Z", reason: "nowe fakty",
      }).success,
    ).toBe(true);
  });
  it("rejects chat_update without reason", () => {
    expect(
      decisionRecordSchema.safeParse({
        origin: "chat_update", decision: "reject", citedRules: ["R2.1"], forcedBy: null,
        createdAt: "2026-11-26T10:00:00.000Z",
      }).success,
    ).toBe(false);
  });
  it("rejects initial without nextSteps", () => {
    const { nextSteps: _n, ...rest } = initial;
    expect(decisionRecordSchema.safeParse(rest).success).toBe(false);
  });
  it("rejects empty citedRules", () => {
    expect(decisionRecordSchema.safeParse({ ...initial, citedRules: [] }).success).toBe(false);
  });
});
