import "server-only";

import { pl } from "@/lib/i18n-pl";
import type { AppUIMessage, DecisionRecord } from "@/lib/schemas";

export function composeFirstMessage(
  record: Extract<DecisionRecord, { origin: "initial" }>,
  id: string,
): AppUIMessage {
  const { decision, citedRules } = record;
  const steps = record.nextSteps.map((step, i) => `${i + 1}. ${step}`).join("\n");
  return {
    id,
    role: "assistant",
    metadata: { decision, origin: "initial", citedRules },
    parts: [
      { type: "text", text: record.greeting },
      {
        type: "data-decision",
        data: { decision, label: pl.decision.labels[decision], origin: "initial" },
      },
      {
        type: "text",
        text: `${pl.decision.justificationHeading}\n\n${record.justification}\n\n${pl.decision.rulesLine(citedRules)}`,
      },
      { type: "text", text: `${pl.decision.nextStepsHeading}\n\n${steps}` },
      { type: "text", text: `_${pl.decision.disclaimer}_` },
    ],
  };
}
