import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetConfigForTests } from "../config";

import { getPolicy, loadPolicies, parseRuleIds, resetPolicyCacheForTests } from "./policy-loader";

const REAL_POLICY_DIR = resolve(process.cwd(), "../docs/policies");

const RETURN_IDS = [
  "R1.1", "R1.2",
  "R2.1", "R2.2", "R2.3", "R2.4", "R2.5",
  "R3.1", "R3.2", "R3.3",
  "R4.1", "R4.2", "R4.3",
  "R5.1", "R5.2", "R5.3",
  "R6.1", "R6.2",
];

const COMPLAINT_IDS = [
  "C1.1", "C1.2",
  "C2.1", "C2.2", "C2.3",
  "C3.1", "C3.2", "C3.3", "C3.4",
  "C4.1", "C4.2", "C4.3",
  "C5.1", "C5.2", "C5.3",
  "C6.1", "C6.2",
];

let tempDirs: string[] = [];

function makeDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "policy-loader-test-"));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, "utf8");
  }
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
  vi.unstubAllEnvs();
  resetConfigForTests();
  resetPolicyCacheForTests();
});

describe("parseRuleIds", () => {
  it("extracts ids from lines that start with a rule id followed by a dot", () => {
    const ids = parseRuleIds("R1.1. First rule\nSome text R9.9. not at line start\nC2.3. Second\n");
    expect(new Set(ids)).toEqual(new Set(["R1.1", "C2.3"]));
  });

  it("ignores section headings such as '## R1. Return window'", () => {
    expect(parseRuleIds("## R1. Return window\n## C3. Excluded damage\n").size).toBe(0);
  });
});

describe("loadPolicies with the real policy files", () => {
  it("loads the return policy with exactly the expected rule ids", () => {
    const { return: policy } = loadPolicies(REAL_POLICY_DIR);
    expect(policy.caseType).toBe("return");
    expect(new Set(policy.ruleIds)).toEqual(new Set(RETURN_IDS));
    expect(policy.text).toContain("R1.1.");
  });

  it("loads the complaint policy with exactly the expected rule ids", () => {
    const { complaint: policy } = loadPolicies(REAL_POLICY_DIR);
    expect(policy.caseType).toBe("complaint");
    expect(new Set(policy.ruleIds)).toEqual(new Set(COMPLAINT_IDS));
    expect(policy.text).toContain("C1.1.");
  });

  it("keeps the key business periods in the rule lines", () => {
    const { return: ret, complaint } = loadPolicies(REAL_POLICY_DIR);
    expect(ret.text).toMatch(/^R1\.1\..*14 calendar days/m);
    expect(complaint.text).toMatch(/^C1\.1\..*24 months/m);
  });
});

describe("loadPolicies failure modes", () => {
  it("throws an Error naming the missing file", () => {
    const dir = makeDir({ "return-policy.md": "R1.1. Only the return policy\n" });
    expect(() => loadPolicies(dir)).toThrow(Error);
    expect(() => loadPolicies(dir)).toThrow(/complaint-policy\.md/);
  });

  it("throws when a file contains no rule ids", () => {
    const dir = makeDir({
      "return-policy.md": "# Empty policy without rules\n",
      "complaint-policy.md": "C1.1. Valid complaint rule\n",
    });
    expect(() => loadPolicies(dir)).toThrow(/no rule ids/);
  });
});

describe("getPolicy", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test");
    vi.stubEnv("LLM_MODEL", "test/model");
    vi.stubEnv("POLICY_DIR", REAL_POLICY_DIR);
    resetConfigForTests();
    resetPolicyCacheForTests();
  });

  it("returns the policy for each case type using the configured policy directory", () => {
    expect(new Set(getPolicy("return").ruleIds)).toEqual(new Set(RETURN_IDS));
    expect(new Set(getPolicy("complaint").ruleIds)).toEqual(new Set(COMPLAINT_IDS));
  });

  it("returns the cached policy on repeated calls", () => {
    expect(getPolicy("return")).toBe(getPolicy("return"));
  });
});
