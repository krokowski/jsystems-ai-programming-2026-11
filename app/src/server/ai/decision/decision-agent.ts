import "server-only";

import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import {
  decisionOutputSchema,
  type CaseForm,
  type DateRuleResult,
  type DecisionOutput,
  type DecisionRecord,
  type ImageFindings,
} from "@/lib/schemas";
import type { CaseType } from "@/lib/schemas/enums";
import { BUDGETS, remainingMs } from "@/server/ai/budgets";
import type { ModelRegistry } from "@/server/ai/models";
import { customerDataBlock, renderPrompt } from "@/server/ai/prompt-library";
import { AiTimeoutError, AiUnavailableError } from "@/server/errors";
import { logStage } from "@/server/logging";
import { getPolicy } from "@/server/policies/policy-loader";
import {
  applyForcedOutcome,
  forcedOutcome,
  validateCitedRules,
  type ForcedOutcome,
} from "@/server/rules/guards";

export type InitialDecisionRecord = Extract<DecisionRecord, { origin: "initial" }>;

export interface DecideDeps {
  registry: ModelRegistry;
  now?: () => Date;
}

export interface DecideInput {
  caseId: string;
  caseType: CaseType;
  form: CaseForm;
  findings: ImageFindings;
  dateRule: DateRuleResult;
  startedAt: number;
}

const FORCED_REASON: Record<ForcedOutcome["forcedBy"], (caseType: CaseType) => string> = {
  date_rule: (caseType) =>
    caseType === "return"
      ? "the 14-day return window has passed (rule R1.1)"
      : "the 24-month complaint period has passed (rule C1.1)",
  unusable_photo: () => "the customer's photo is unusable as evidence",
  category_mismatch: () => "the photo shows a product other than the declared category",
};

function forcedSentence(caseType: CaseType, forced: ForcedOutcome | null): string {
  if (forced === null) return "";
  return `The decision is fixed to ${forced.decision} because ${FORCED_REASON[forced.forcedBy](caseType)}. Explain it; do not choose another decision.`;
}

function categoryNotes(caseType: CaseType, form: CaseForm): string {
  if (caseType === "return" && form.category === "audio") {
    return "The product is audio equipment. The hygienic seal of in-ear headphones (R3.1) cannot be verified from a photo; do not approve by claiming the seal is intact. Use manual_review or ask about the seal in the chat.";
  }
  return "";
}

function yesNo(value: boolean | null): string {
  if (value === null) return "unknown";
  return value ? "yes" : "no";
}

function caseFacts(caseType: CaseType, form: CaseForm): string {
  return [
    `Case type: ${caseType}`,
    `Product category: ${form.category}`,
    `Purchase date: ${form.purchaseDate}`,
    customerDataBlock("product_name", form.productName),
  ].join("\n");
}

function findingsText(findings: ImageFindings): string {
  return [
    `source: ${findings.source}`,
    `photoUsable: ${findings.photoUsable}`,
    `usabilityIssue: ${findings.usabilityIssue ?? "none"}`,
    `categoryMatch: ${findings.categoryMatch}`,
    `damageVisible: ${findings.damageVisible}`,
    `damageType: ${findings.damageType}`,
    `damageLocation: ${findings.damageLocation ?? "none"}`,
    `likelyCause: ${findings.likelyCause}`,
    `signsOfUse: ${yesNo(findings.signsOfUse)}`,
    `resellable: ${yesNo(findings.resellable)}`,
    `conditionScore (0 = like new, 4 = severely damaged): ${findings.conditionScore}`,
    `descriptionConsistent: ${yesNo(findings.descriptionConsistent)}`,
    `screeningDisagreements: ${findings.screeningDisagreements.join("; ") || "none"}`,
    `notes: ${findings.notes}`,
  ].join("\n");
}

function dateFacts(rule: DateRuleResult): string {
  const lines = [
    `Reference date: ${rule.referenceDate}`,
    `Purchase date: ${rule.purchaseDate}`,
    `Days since purchase: ${rule.daysSincePurchase}`,
    `Deadline: ${rule.deadline ?? "none"}`,
    `Within the period (${rule.ruleId}): ${rule.withinPeriod ? "yes" : "no"}`,
  ];
  if (rule.withinCosmeticWindow !== null) {
    lines.push(`Within 14-day cosmetic-defect window (C2.3): ${rule.withinCosmeticWindow ? "yes" : "no"}`);
  }
  return lines.join("\n");
}

const openRouterUsageSchema = z.object({
  cost: z.number().nullish(),
  costDetails: z.object({ upstreamInferenceCost: z.number().nullish() }).nullish(),
});

/** BYOK: usage.cost is 0; the AI SDK exposes the real spend as providerMetadata.openrouter.usage.costDetails.upstreamInferenceCost (ADR-005 A22). */
function costCredits(providerMetadata: unknown): number | null {
  const meta = z
    .object({ openrouter: z.object({ usage: openRouterUsageSchema }) })
    .safeParse(providerMetadata);
  if (!meta.success) return null;
  const usage = meta.data.openrouter.usage;
  return usage.cost || usage.costDetails?.upstreamInferenceCost || 0;
}

type Attempt =
  | { ok: true; output: DecisionOutput; cost: number | null }
  | { ok: false; error: string };

function isTimeout(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  return err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
}

async function attempt(
  deps: DecideDeps,
  prompt: string,
  signal: AbortSignal,
  policyRuleIds: ReadonlySet<string>,
): Promise<Attempt> {
  try {
    const result = await generateText({
      model: deps.registry.languageModel("decision"),
      instructions: prompt,
      prompt: "Produce the structured decision now.",
      output: Output.object({ schema: decisionOutputSchema, name: "decision_output" }),
      abortSignal: signal,
      maxRetries: 0,
    });
    const output = result.output;
    const cited = validateCitedRules(output.citedRules, policyRuleIds);
    if (!cited.ok) {
      const detail =
        cited.reason === "empty"
          ? "citedRules was empty"
          : `citedRules contained unknown rule ids: ${cited.invalid.join(", ")}`;
      return { ok: false, error: detail };
    }
    return { ok: true, output, cost: costCredits(result.providerMetadata) };
  } catch (err) {
    if (isTimeout(err, signal)) throw new AiTimeoutError("Decision call timed out", { cause: err });
    if (NoObjectGeneratedError.isInstance(err)) {
      return { ok: false, error: "the output did not match the required JSON schema" };
    }
    if (APICallError.isInstance(err)) {
      throw new AiUnavailableError(`Decision call failed (HTTP ${err.statusCode ?? "n/a"})`, { cause: err });
    }
    throw new AiUnavailableError("Decision call failed", { cause: err });
  }
}

export async function decide(deps: DecideDeps, input: DecideInput): Promise<InitialDecisionRecord> {
  const { caseId, caseType, form, findings, dateRule, startedAt } = input;
  const now = deps.now ?? ((): Date => new Date());
  const policy = getPolicy(caseType);
  const forced = forcedOutcome({ caseType, dateRule, findings });
  const rendered = renderPrompt(caseType === "return" ? "decision-return" : "decision-complaint", {
    policyText: policy.text,
    caseFacts: caseFacts(caseType, form),
    customerReason: customerDataBlock("reason", form.reason === "" ? "(no reason given)" : form.reason),
    findings: findingsText(findings),
    dateFacts: dateFacts(dateRule),
    forcedOutcome: forcedSentence(caseType, forced),
    categoryNotes: categoryNotes(caseType, form),
  });
  const model = deps.registry.modelId("decision");
  const started = now().getTime();

  const log = (fields: {
    status: "ok" | "error";
    errorKind?: string;
    cost?: number | null;
    decision?: string;
    modelDecision?: string;
    forcedBy?: string | null;
  }): void =>
    logStage({
      caseId,
      stage: "decision",
      durationMs: now().getTime() - started,
      model,
      promptVersion: rendered.version,
      decision: fields.decision ?? null,
      forcedBy: fields.forcedBy ?? null,
      modelDecision: fields.modelDecision ?? null,
      costCredits: fields.cost ?? null,
      status: fields.status,
      errorKind: fields.errorKind ?? null,
    });

  let prompt = rendered.text;
  let totalCost: number | null = null;
  let lastError = "";
  for (let tryNo = 0; tryNo < 2; tryNo += 1) {
    const left = remainingMs(startedAt, BUDGETS.decisionMs, Date.now());
    if (tryNo > 0 && left < BUDGETS.retryMinRemainingMs) break;
    const signal = AbortSignal.timeout(left);
    let result: Attempt;
    try {
      result = await attempt(deps, prompt, signal, policy.ruleIds);
    } catch (err) {
      log({ status: "error", errorKind: err instanceof AiTimeoutError ? "timeout" : "http", cost: totalCost });
      throw err;
    }
    if (result.ok) {
      const applied = applyForcedOutcome({
        forced,
        modelDecision: result.output.decision,
        citedRules: result.output.citedRules,
        policyRuleIds: policy.ruleIds,
      });
      totalCost = (totalCost ?? 0) + (result.cost ?? 0);
      log({
        status: "ok",
        cost: totalCost,
        decision: applied.decision,
        modelDecision: applied.modelDecision,
        forcedBy: applied.forcedBy,
      });
      return {
        origin: "initial",
        decision: applied.decision,
        citedRules: applied.citedRules,
        forcedBy: applied.forcedBy,
        modelDecision: applied.modelDecision,
        greeting: result.output.greeting,
        justification: result.output.justification,
        nextSteps: result.output.nextSteps,
        createdAt: now().toISOString(),
      };
    }
    lastError = result.error;
    prompt = `${rendered.text}\n\n# Validation error in your previous answer\n\nYour previous answer was rejected: ${lastError}. Answer again and fix this. Cite only rule ids that appear in the policy.`;
  }

  log({ status: "error", errorKind: "invalid_output", cost: totalCost });
  throw new AiUnavailableError(`Decision output invalid: ${lastError}`);
}
