import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { pl } from "@/lib/i18n-pl";
import { decisionSchema, type DecisionData, type DecisionRecord } from "@/lib/schemas";
import type { Case } from "@/server/cases/repository";
import type { Policy } from "@/server/policies/policy-loader";
import { allowedChatUpdate } from "@/server/rules/guards";

export type ChatUpdateRecord = Extract<DecisionRecord, { origin: "chat_update" }>;

export const updateDecisionInputSchema = z.object({
  decision: decisionSchema,
  reason: z.string().min(1),
  citedRules: z.array(z.string()).min(1),
});

export const UPDATE_DECISION_DESCRIPTION =
  "Call before writing any text, only when new facts from the customer change the outcome under the policy. Never call because the customer insists without new facts. The reason is 1-3 Polish sentences; citedRules are exact rule ids from the policy.";

export type UpdateDecisionResult = { accepted: true } | { accepted: false; why: string };

export interface UpdateDecisionDeps {
  case: Case;
  policy: Policy;
  now: () => Date;
  /** Called once per accepted update with the record to store. */
  onAccepted: (record: ChatUpdateRecord) => void;
  /** Writes the `data-decision` part to the client stream (ADR-005 A5 fields only). */
  writeDecision: (data: DecisionData) => void;
}

/**
 * One tool instance per assistant message: the per-message counter lives in the closure
 * (ADR-002 §3.5, "at most one accepted update per assistant message").
 */
export function createUpdateDecisionTool(deps: UpdateDecisionDeps) {
  let accepted = 0;
  return tool({
    description: UPDATE_DECISION_DESCRIPTION,
    inputSchema: updateDecisionInputSchema,
    execute: (input): UpdateDecisionResult => {
      const { case: current } = deps;
      if (current.findings === null || current.decision === null) {
        return { accepted: false, why: "The case has no decision or image findings yet." };
      }
      const check = allowedChatUpdate(
        {
          caseType: current.form.caseType,
          dateRule: current.dateRule,
          findings: current.findings,
          currentDecision: current.decision.decision,
          policyRuleIds: deps.policy.ruleIds,
          acceptedUpdatesInThisMessage: accepted,
        },
        input,
      );
      if (!check.ok) return { accepted: false, why: check.why };

      accepted += 1;
      const record: ChatUpdateRecord = {
        origin: "chat_update",
        decision: input.decision,
        citedRules: input.citedRules,
        forcedBy: null,
        createdAt: deps.now().toISOString(),
        reason: input.reason,
      };
      deps.onAccepted(record);
      deps.writeDecision({
        decision: input.decision,
        label: pl.decision.labels[input.decision],
        origin: "chat_update",
        reason: input.reason,
      });
      return { accepted: true };
    },
  });
}
