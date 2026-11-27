import "server-only";

import { describe, expect, it } from "vitest";

import { imageFindingsSchema, type ScreeningArea, type ScreeningResult } from "@/lib/schemas/domain";

import { findingsFromScreening } from "./findings-from-screening";

function noul(key: string, value: boolean, certain = true): ScreeningArea {
  return { key, type: "noul", value, probabilities: null, confidence: 0.93, certain, refused: false };
}

function choice(key: string, value: string, certain = true): ScreeningArea {
  return { key, type: "choice", value, probabilities: null, confidence: 0.9, certain, refused: false };
}

function score(key: string, value: number, certain = true): ScreeningArea {
  return { key, type: "score", value, probabilities: null, confidence: 0.88, certain, refused: false };
}

function screeningOf(areas: ScreeningArea[], overrides: Partial<ScreeningResult> = {}): ScreeningResult {
  return {
    model: "test-model",
    promptVersion: "test",
    areas,
    allCertain: areas.every((a) => a.certain && !a.refused),
    uncertainKeys: areas.filter((a) => !a.certain || a.refused).map((a) => a.key),
    costCredits: null,
    durationMs: 1,
    error: null,
    ...overrides,
  };
}

function returnScreening(options: { condition: number; damageVisible?: boolean; signsOfUse?: boolean }): ScreeningResult {
  return screeningOf([
    noul("photo_usable", true),
    noul("category_match", true),
    noul("damage_visible", options.damageVisible ?? false),
    noul("signs_of_use", options.signsOfUse ?? false),
    score("condition", options.condition),
  ]);
}

function complaintScreening(overrides: Partial<Record<string, ScreeningArea>> = {}): ScreeningResult {
  const areas: ScreeningArea[] = [
    noul("photo_usable", true),
    noul("category_match", true),
    noul("damage_visible", false),
    choice("damage_type", "none_visible"),
    choice("damage_cause", "no_visible_damage"),
    noul("description_consistent", true),
    score("condition", 3),
  ];
  return screeningOf(areas.map((a) => overrides[a.key] ?? a));
}

describe("findingsFromScreening", () => {
  it("maps a fast-path return to schema-valid findings", () => {
    const findings = findingsFromScreening("return", returnScreening({ condition: 2 }));

    expect(imageFindingsSchema.parse(findings)).toEqual(findings);
    expect(findings).toMatchObject({
      source: "screening",
      photoUsable: true,
      usabilityIssue: null,
      categoryMatch: true,
      damageVisible: false,
      damageType: "none_visible",
      damageLocation: null,
      likelyCause: "no_visible_damage",
      signsOfUse: false,
      conditionScore: 2,
      descriptionConsistent: null,
      screeningDisagreements: [],
    });
  });

  it("sets resellable true for a return with no visible damage, no use and condition 1", () => {
    const findings = findingsFromScreening("return", returnScreening({ condition: 1 }));
    expect(findings.resellable).toBe(true);
  });

  it("sets resellable false for a return with no visible damage, no use and condition 2", () => {
    const findings = findingsFromScreening("return", returnScreening({ condition: 2 }));
    expect(findings.resellable).toBe(false);
  });

  it("maps a return with visible damage to other / undetermined and not resellable", () => {
    const findings = findingsFromScreening(
      "return",
      returnScreening({ condition: 0, damageVisible: true }),
    );
    expect(findings).toMatchObject({
      damageVisible: true,
      damageType: "other",
      likelyCause: "undetermined",
      resellable: false,
      damageLocation: null,
    });
    expect(imageFindingsSchema.parse(findings).damageVisible).toBe(true);
  });

  it("returns signsOfUse null and resellable null for a complaint on the fast path", () => {
    const findings = findingsFromScreening("complaint", complaintScreening());
    expect(findings).toMatchObject({
      source: "screening",
      photoUsable: true,
      usabilityIssue: null,
      signsOfUse: null,
      resellable: null,
      damageLocation: null,
      damageType: "none_visible",
      likelyCause: "no_visible_damage",
      descriptionConsistent: true,
      conditionScore: 3,
      screeningDisagreements: [],
    });
    expect(imageFindingsSchema.parse(findings).signsOfUse).toBeNull();
  });

  it("builds notes that name each screening area with its confidence", () => {
    const findings = findingsFromScreening("return", returnScreening({ condition: 1 }));
    expect(findings.notes.startsWith("Screening only (no LLM vision): ")).toBe(true);
    expect(findings.notes).toContain("photo_usable=true (0.93)");
    expect(findings.notes).toContain("condition=1 (0.88)");
  });

  it("throws when the table would escalate, for example an unusable photo", () => {
    const screening = screeningOf([
      noul("photo_usable", false),
      noul("category_match", true),
      noul("damage_visible", false),
      noul("signs_of_use", false),
      score("condition", 1),
    ]);
    expect(() => findingsFromScreening("return", screening)).toThrow(Error);
  });

  it("throws when a required area is missing", () => {
    const screening = screeningOf([
      noul("photo_usable", true),
      noul("category_match", true),
      noul("damage_visible", false),
      score("condition", 1),
    ]);
    expect(() => findingsFromScreening("return", screening)).toThrow(Error);
  });

  it("throws for a complaint with visible damage", () => {
    const screening = complaintScreening({ damage_visible: noul("damage_visible", true) });
    expect(() => findingsFromScreening("complaint", screening)).toThrow(Error);
  });
});
