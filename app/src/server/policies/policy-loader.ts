import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { CaseType } from "@/lib/schemas";

import { getConfig } from "../config";

export interface Policy {
  caseType: CaseType;
  text: string;
  ruleIds: ReadonlySet<string>;
}

export interface LoadedPolicies {
  return: Policy;
  complaint: Policy;
}

const POLICY_FILES: Record<CaseType, string> = {
  return: "return-policy.md",
  complaint: "complaint-policy.md",
};

const RULE_ID_LINE = /^([RC]\d+\.\d+)\./gm;

/** Rule ids (R1.1, C3.4, ...) found at the start of policy lines (ADR-002 section 3.1). */
export function parseRuleIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(RULE_ID_LINE)) {
    const id = match[1];
    if (id !== undefined) ids.add(id);
  }
  return ids;
}

function readPolicy(policyDir: string, caseType: CaseType): Policy {
  const fileName = POLICY_FILES[caseType];
  let text: string;
  try {
    text = readFileSync(join(/*turbopackIgnore: true*/ policyDir, fileName), "utf8");
  } catch {
    throw new Error(`Cannot read policy file ${fileName} in ${policyDir}`);
  }
  const ruleIds = parseRuleIds(text);
  if (ruleIds.size === 0) {
    throw new Error(`Policy file ${fileName} contains no rule ids`);
  }
  return { caseType, text, ruleIds };
}

/** Synchronously loads both policies from `policyDir`; throws if a file is missing or has no rule ids. */
export function loadPolicies(policyDir: string): LoadedPolicies {
  return {
    return: readPolicy(policyDir, "return"),
    complaint: readPolicy(policyDir, "complaint"),
  };
}

let cache: LoadedPolicies | undefined;

export function getPolicy(caseType: CaseType): Policy {
  if (cache === undefined) {
    cache = loadPolicies(getConfig().policyDir);
  }
  return cache[caseType];
}

export function resetPolicyCacheForTests(): void {
  cache = undefined;
}
