import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { TestType } from "@playwright/test";

export const SKIP_MESSAGE =
  "OPENROUTER_API_KEY missing in app/.env.local: AI spec skipped (does not count as a pass)";

function hasKey(): boolean {
  if (process.env.OPENROUTER_API_KEY) return true;
  const file = path.resolve(__dirname, "../../../.env.local");
  if (!existsSync(file)) return false;
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .some((line) => /^\s*OPENROUTER_API_KEY=\s*\S+/.test(line));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function skipWithoutKey(test: Pick<TestType<any, any>, "skip">): void {
  test.skip(!hasKey(), SKIP_MESSAGE);
}
