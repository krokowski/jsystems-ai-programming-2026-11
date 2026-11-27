import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

export type PromptName =
  | "vision-return"
  | "vision-complaint"
  | "decision-return"
  | "decision-complaint"
  | "chat-system";

export interface RenderedPrompt {
  name: PromptName;
  version: string;
  text: string;
}

export const PROMPT_DIR: string = path.join(process.cwd(), "src/server/ai/prompts");

interface PromptTemplate {
  version: string;
  body: string;
  placeholders: ReadonlySet<string>;
}

const HEADER = /^<!--\s*prompt:\s*(\S+)\s*\|\s*version:\s*(\S+)\s*-->\r?\n?/;
const PLACEHOLDER = /\{\{(\w+)\}\}/g;

const cache = new Map<PromptName, PromptTemplate>();

function loadTemplate(name: PromptName): PromptTemplate {
  const cached = cache.get(name);
  if (cached) return cached;
  const raw = readFileSync(path.join(PROMPT_DIR, `${name}.md`), "utf8");
  const header = HEADER.exec(raw);
  if (!header || header[1] !== name || !header[2]) {
    throw new Error(`Prompt "${name}" has a missing or mismatched version header`);
  }
  const body = raw.slice(header[0].length).trim();
  const placeholders = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER)) {
    if (match[1]) placeholders.add(match[1]);
  }
  const template: PromptTemplate = { version: header[2], body, placeholders };
  cache.set(name, template);
  return template;
}

export function renderPrompt(name: PromptName, vars: Readonly<Record<string, string>>): RenderedPrompt {
  const template = loadTemplate(name);
  for (const placeholder of template.placeholders) {
    if (!Object.hasOwn(vars, placeholder)) {
      throw new Error(`Prompt "${name}": missing variable "${placeholder}"`);
    }
  }
  for (const key of Object.keys(vars)) {
    if (!template.placeholders.has(key)) {
      throw new Error(`Prompt "${name}": unknown variable "${key}"`);
    }
  }
  // Single pass, so placeholder-like text inside a value is never expanded again.
  const text = template.body.replace(PLACEHOLDER, (_whole, key: string) => vars[key] ?? "");
  return { name, version: template.version, text };
}

export function customerDataBlock(label: string, text: string): string {
  const safe = text.replace(/<(\s*\/\s*customer_data)/gi, "&lt;$1");
  const safeLabel = label.replace(/[^\w.-]/g, "_");
  return `<customer_data label="${safeLabel}">\n${safe}\n</customer_data>`;
}
