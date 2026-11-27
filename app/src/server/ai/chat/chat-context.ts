import "server-only";

import { type Case } from "@/server/cases/repository";
import type { DateRuleResult, DecisionRecord } from "@/lib/schemas";
import type { Policy } from "@/server/policies/policy-loader";

import { customerDataBlock, renderPrompt, type RenderedPrompt } from "../prompt-library";

const AUDIO_RETURN_NOTE =
  "Category audio, return: the hygienic seal of in-ear headphones (Return Policy R3.1) cannot be verified from a photo. Never approve by claiming the seal is intact; ask the customer about it or use manual_review.";

/** ISO yyyy-MM-dd to dd.MM.yyyy (the format the prompt asks the model to use). */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function dateFacts(rule: DateRuleResult): string {
  const lines = [
    `referenceDate (today): ${formatDate(rule.referenceDate)}`,
    `purchaseDate: ${formatDate(rule.purchaseDate)}`,
    `daysSincePurchase: ${rule.daysSincePurchase}`,
    `withinPeriod: ${rule.withinPeriod} (rule ${rule.ruleId})`,
    `deadline: ${rule.deadline === null ? "none" : formatDate(rule.deadline)}`,
  ];
  if (rule.withinCosmeticWindow !== null) {
    lines.push(`withinCosmeticWindow (14 days, C2.3): ${rule.withinCosmeticWindow}`);
  }
  return lines.join("\n");
}

function historyLine(record: DecisionRecord): string {
  return `- ${record.origin}: ${record.decision} (rules ${record.citedRules.join(", ")}, ${record.createdAt})`;
}

/**
 * Renders `chat-system.md` from the stored case (ADR-002 §3.5). Free text from the customer (the reason,
 * the product name) is delimited as data. The photo is not re-sent: only the stored findings.
 */
export function renderChatInstructions(current: Case, policy: Policy): RenderedPrompt {
  if (current.decision === null || current.findings === null) {
    throw new Error("The chat needs a case with a decision and image findings");
  }
  const { form } = current;
  const caseFacts = [
    `Case type: ${form.caseType}`,
    `Category: ${form.category}`,
    `Product name: ${customerDataBlock("productName", form.productName)}`,
    `Purchase date: ${formatDate(form.purchaseDate)}`,
  ].join("\n");
  const reason = form.reason.trim() === "" ? "No reason was given." : customerDataBlock("reason", form.reason);
  const categoryNotes = form.caseType === "return" && form.category === "audio" ? AUDIO_RETURN_NOTE : "";

  return renderPrompt("chat-system", {
    policyText: policy.text,
    caseFacts,
    customerReason: reason,
    findings: JSON.stringify(current.findings),
    dateFacts: dateFacts(current.dateRule),
    currentDecision: current.decision.decision,
    decisionHistory: current.decisionHistory.length === 0 ? "- none" : current.decisionHistory.map(historyLine).join("\n"),
    categoryNotes,
  });
}
