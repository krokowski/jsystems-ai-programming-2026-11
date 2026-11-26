import "server-only";

import { describe, expect, it } from "vitest";

import type { ScreeningArea, ScreeningResult } from "@/lib/schemas/domain";

import { decideEscalation } from "./escalation";

function noul(key: string, value: boolean, certain = true): ScreeningArea {
  return { key, type: "noul", value, probabilities: null, confidence: 0.93, certain, refused: false };
}

function choice(key: string, value: string, certain = true): ScreeningArea {
  return { key, type: "choice", value, probabilities: null, confidence: 0.9, certain, refused: false };
}

function score(key: string, value: number, certain = true): ScreeningArea {
  return { key, type: "score", value, probabilities: null, confidence: 0.88, certain, refused: false };
}

function returnAreas(overrides: Partial<Record<string, ScreeningArea>> = {}): ScreeningArea[] {
  const base: ScreeningArea[] = [
    noul("photo_usable", true),
    noul("category_match", true),
    noul("damage_visible", false),
    noul("signs_of_use", false),
    score("condition", 1),
  ];
  return base.map((a) => overrides[a.key] ?? a);
}

function complaintAreas(overrides: Partial<Record<string, ScreeningArea>> = {}): ScreeningArea[] {
  const base: ScreeningArea[] = [
    noul("photo_usable", true),
    noul("category_match", true),
    noul("damage_visible", false),
    choice("damage_type", "none_visible"),
    choice("damage_cause", "no_visible_damage"),
    noul("description_consistent", true),
    score("condition", 3),
  ];
  return base.map((a) => overrides[a.key] ?? a);
}

function screeningOf(
  areas: ScreeningArea[],
  overrides: Partial<ScreeningResult> = {},
): ScreeningResult {
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

describe("decideEscalation", () => {
  it("escalates with signals when mode is always, even if every area is certain", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "always",
      screening: screeningOf(returnAreas()),
    });
    expect(decision).toEqual({ action: "escalate", withSignals: true, uncertainKeys: [], reason: "always" });
  });

  it("uses the screening uncertainKeys for the always mode", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "always",
      screening: screeningOf(returnAreas({ signs_of_use: noul("signs_of_use", false, false) })),
    });
    expect(decision).toMatchObject({ action: "escalate", withSignals: true, uncertainKeys: ["signs_of_use"], reason: "always" });
  });

  it("skips a return with all areas certain and a usable photo in auto mode", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "auto",
      screening: screeningOf(returnAreas()),
    });
    expect(decision).toEqual({ action: "skip", withSignals: false, uncertainKeys: [], reason: "all_certain" });
  });

  it("escalates without signals on a screening timeout", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "auto",
      screening: screeningOf(returnAreas(), { error: { kind: "timeout" } }),
    });
    expect(decision).toMatchObject({ action: "escalate", withSignals: false, reason: "screening_error" });
  });

  it("lets mode always win over a screening error and keeps signals", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "always",
      screening: screeningOf(returnAreas(), { error: { kind: "http", status: 500 } }),
    });
    expect(decision).toMatchObject({ action: "escalate", withSignals: true, reason: "always" });
  });

  it("escalates with the uncertain key when one area is not certain", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "auto",
      screening: screeningOf(returnAreas({ condition: score("condition", 2, false) })),
    });
    expect(decision).toEqual({
      action: "escalate",
      withSignals: true,
      uncertainKeys: ["condition"],
      reason: "uncertain",
    });
  });

  it("escalates when an area is refused", () => {
    const refused: ScreeningArea = { ...noul("damage_visible", false), refused: true };
    const decision = decideEscalation({
      caseType: "return",
      mode: "auto",
      screening: screeningOf(returnAreas({ damage_visible: refused })),
    });
    expect(decision).toMatchObject({ action: "escalate", withSignals: true, uncertainKeys: ["damage_visible"], reason: "uncertain" });
  });

  it("escalates when a required area is missing", () => {
    const withoutDescription = complaintAreas().filter((a) => a.key !== "description_consistent");
    const decision = decideEscalation({
      caseType: "complaint",
      mode: "auto",
      screening: screeningOf(withoutDescription),
    });
    expect(decision).toMatchObject({
      action: "escalate",
      withSignals: true,
      uncertainKeys: ["description_consistent"],
      reason: "uncertain",
    });
  });

  it("treats a certain area with a null value as uncertain", () => {
    const nullValue: ScreeningArea = { ...noul("photo_usable", true), value: null };
    const decision = decideEscalation({
      caseType: "return",
      mode: "auto",
      screening: screeningOf(returnAreas({ photo_usable: nullValue })),
    });
    expect(decision).toMatchObject({ action: "escalate", withSignals: true, uncertainKeys: ["photo_usable"], reason: "uncertain" });
  });

  it("escalates with signals when a certain photo_usable is false", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "auto",
      screening: screeningOf(returnAreas({ photo_usable: noul("photo_usable", false) })),
    });
    expect(decision).toEqual({ action: "escalate", withSignals: true, uncertainKeys: [], reason: "photo_unusable" });
  });

  it("escalates a complaint with certain visible damage so the location is produced", () => {
    const decision = decideEscalation({
      caseType: "complaint",
      mode: "auto",
      screening: screeningOf(
        complaintAreas({
          damage_visible: noul("damage_visible", true),
          damage_type: choice("damage_type", "screen_crack"),
          damage_cause: choice("damage_cause", "mechanical_impact"),
        }),
      ),
    });
    expect(decision).toEqual({ action: "escalate", withSignals: true, uncertainKeys: [], reason: "complaint_damage" });
  });

  it("skips a complaint with a usable photo and no visible damage", () => {
    const decision = decideEscalation({
      caseType: "complaint",
      mode: "auto",
      screening: screeningOf(complaintAreas()),
    });
    expect(decision).toEqual({ action: "skip", withSignals: false, uncertainKeys: [], reason: "all_certain" });
  });

  it("skips a return with visible damage on a usable photo (fast path, A4 does not escalate returns for damage)", () => {
    const decision = decideEscalation({
      caseType: "return",
      mode: "auto",
      screening: screeningOf(returnAreas({ damage_visible: noul("damage_visible", true) })),
    });
    expect(decision).toMatchObject({ action: "skip", reason: "all_certain" });
  });
});
