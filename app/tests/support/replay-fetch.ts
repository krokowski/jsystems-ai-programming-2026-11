import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Replays raw OpenRouter captures (plan TR4). Tests inject the returned `fetch` into
 * the real provider / Decisions adapter, so the real request building and response
 * parsing run. Only values inside the captured structure may be changed (derived
 * fixtures); new fields, event types or status codes must never be added.
 */

export const CAPTURES_DIR = path.resolve(__dirname, "../fixtures/captures");

const captureSchema = z.object({
  capturedAt: z.string(),
  spike: z.string(),
  target: z.string(),
  model: z.string().optional(),
  request: z.unknown(),
  response: z.object({
    status: z.number(),
    headers: z.record(z.string(), z.string()),
    body: z.unknown().optional(),
    rawText: z.string().optional(),
  }),
  notes: z.unknown().optional(),
});

export type Capture = z.infer<typeof captureSchema>;

/** Loads one capture file from tests/fixtures/captures (e.g. "s5-decision.json"). */
export function loadCapture(fileName: string): Capture {
  const raw: unknown = JSON.parse(readFileSync(path.join(CAPTURES_DIR, fileName), "utf8"));
  return captureSchema.parse(raw);
}

/** Returns a deep copy of a capture's JSON body, for derived variants. */
export function captureBody(capture: Capture): unknown {
  return structuredClone(capture.response.body);
}

export interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
}

export interface ReplayStep {
  /** The capture whose status and headers are replayed. */
  capture: Capture;
  /** Optional derived JSON body (must keep the captured structure). Defaults to the captured body. */
  body?: unknown;
  /** Optional derived SSE text (must keep the captured event types). Defaults to the captured rawText. */
  rawText?: string;
}

export interface ReplayFetch {
  fetch: typeof fetch;
  calls: RecordedCall[];
}

function toResponse(step: ReplayStep): Response {
  const { status, headers } = step.capture.response;
  // Drop hop-by-hop / encoding headers that no longer describe the replayed body.
  const replayHeaders = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower === "content-length" || lower === "content-encoding" || lower === "transfer-encoding") continue;
    replayHeaders.set(name, value);
  }
  const text = step.rawText ?? step.capture.response.rawText;
  if (text !== undefined) {
    return new Response(text, { status, headers: replayHeaders });
  }
  const body = step.body ?? step.capture.response.body;
  return new Response(JSON.stringify(body), { status, headers: replayHeaders });
}

function parseBody(init: RequestInit | undefined): unknown {
  const body = init?.body;
  if (typeof body !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed;
  } catch {
    return body;
  }
}

/**
 * A fetch that answers each call with the next step, in order. More calls than steps
 * throw (the test then fails loudly instead of inventing a response).
 */
export function replayFetch(steps: readonly ReplayStep[]): ReplayFetch {
  const calls: RecordedCall[] = [];
  let index = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, method: init?.method ?? "GET", body: parseBody(init) });
    if (init?.signal?.aborted) {
      throw init.signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
    }
    const step = steps[index];
    index += 1;
    if (step === undefined) {
      throw new Error(`replayFetch: no capture left for call ${index} to ${url}`);
    }
    return toResponse(step);
  };
  return { fetch: fetchImpl, calls };
}

/**
 * A fetch that never answers until the request is aborted: a real non-HTTP failure
 * used for timeout tests (TR4).
 */
export function hangingFetch(): ReplayFetch {
  const calls: RecordedCall[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, method: init?.method ?? "GET", body: parseBody(init) });
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      const onAbort = (): void => {
        reject(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    });
  };
  return { fetch: fetchImpl, calls };
}
