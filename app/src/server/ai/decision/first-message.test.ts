import "server-only";

import { validateUIMessages } from "ai";
import { describe, expect, it } from "vitest";

import { pl } from "@/lib/i18n-pl";
import { dataPartSchemas, messageMetadataSchema } from "@/lib/schemas";
import type { Decision, DecisionRecord } from "@/lib/schemas";

import { composeFirstMessage } from "./first-message";

type InitialRecord = Extract<DecisionRecord, { origin: "initial" }>;

function record(decision: Decision): InitialRecord {
  return {
    origin: "initial",
    decision,
    modelDecision: decision,
    citedRules: ["R1.1", "R2.1"],
    forcedBy: null,
    createdAt: "2026-11-26T10:00:00.000Z",
    greeting: "Dzień dobry, sprawdziłem Twoje zgłoszenie.",
    justification: "Zgłoszenie mieści się w terminie.",
    nextSteps: ["Krok a", "Krok b", "Krok c", "Krok d", "Krok e", "Krok f"],
  };
}

describe("composeFirstMessage", () => {
  it("builds the five parts in order", () => {
    const msg = composeFirstMessage(record("approve"), "m1");
    expect(msg.role).toBe("assistant");
    expect(msg.id).toBe("m1");
    expect(msg.metadata).toEqual({
      decision: "approve",
      origin: "initial",
      citedRules: ["R1.1", "R2.1"],
    });
    expect(msg.parts.map((p) => p.type)).toEqual([
      "text",
      "data-decision",
      "text",
      "text",
      "text",
    ]);
    expect(msg.parts[0]).toEqual({ type: "text", text: "Dzień dobry, sprawdziłem Twoje zgłoszenie." });
  });

  it.each([
    ["approve", "Zaakceptowano"],
    ["reject", "Odrzucono"],
    ["manual_review", "Do weryfikacji przez pracownika"],
  ] as const)("labels %s as %s", (decision, label) => {
    const part = composeFirstMessage(record(decision), "m").parts[1];
    expect(part).toEqual({
      type: "data-decision",
      data: { decision, label, origin: "initial" },
    });
  });

  it("renders justification with the rules line", () => {
    const part = composeFirstMessage(record("approve"), "m").parts[2];
    expect(part).toEqual({
      type: "text",
      text: `${pl.decision.justificationHeading}\n\nZgłoszenie mieści się w terminie.\n\nZastosowane zasady: R1.1, R2.1`,
    });
  });

  it("renders six numbered next steps", () => {
    const part = composeFirstMessage(record("approve"), "m").parts[3];
    expect(part).toEqual({
      type: "text",
      text:
        "### Następne kroki\n\n" +
        "1. Krok a\n2. Krok b\n3. Krok c\n4. Krok d\n5. Krok e\n6. Krok f",
    });
  });

  it("ends with the italic PRD disclaimer", () => {
    const parts = composeFirstMessage(record("reject"), "m").parts;
    expect(parts[parts.length - 1]).toEqual({
      type: "text",
      text: "_To jest wstępna decyzja. Ostateczna decyzja zostanie podjęta po oględzinach produktu przez nasz serwis._",
    });
  });

  it("never shows the raw decision enum as visible text", () => {
    for (const d of ["approve", "reject", "manual_review"] as const) {
      const visible = composeFirstMessage(record(d), "m")
        .parts.map((p) => (p.type === "text" ? p.text : ""))
        .join("\n");
      expect(visible).not.toContain(d);
    }
  });

  it("validates as an AppUIMessage", async () => {
    const msg = composeFirstMessage(record("manual_review"), "m");
    const result = await validateUIMessages({
      messages: [msg],
      metadataSchema: messageMetadataSchema,
      dataSchemas: dataPartSchemas,
    });
    expect(result).toHaveLength(1);
  });
});
