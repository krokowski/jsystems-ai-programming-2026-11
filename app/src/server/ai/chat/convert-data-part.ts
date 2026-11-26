import "server-only";

import type { DataUIPart } from "ai";

import type { AppDataParts } from "@/lib/schemas";

/**
 * `convertToModelMessages` option (ADR-002 §3.5): a stored `data-decision` part becomes a short
 * text line so the model sees every decision change. Other data parts are ignored.
 */
export function convertDataPart(part: DataUIPart<AppDataParts>): { type: "text"; text: string } | undefined {
  if (part.type === "data-decision") {
    return { type: "text", text: `[Decision: ${part.data.decision} — origin: ${part.data.origin}]` };
  }
  return undefined;
}
