import "server-only";

import {
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type InferUIMessageChunk,
} from "ai";
import { z } from "zod";

import { pl } from "@/lib/i18n-pl";
import type { AppUIMessage, CaseType } from "@/lib/schemas";
import type { Case } from "@/server/cases/repository";
import { AiTimeoutError } from "@/server/errors";
import { logStage, type StageLogEntry } from "@/server/logging";
import { getPolicy, type Policy } from "@/server/policies/policy-loader";

import { BUDGETS } from "../budgets";
import type { ModelRegistry } from "../models";
import { renderChatInstructions } from "./chat-context";
import { convertDataPart } from "./convert-data-part";
import { createUpdateDecisionTool, type ChatUpdateRecord } from "./update-decision-tool";

/** Reasoning never reaches the customer (ADR-002 §6.4); the start chunk is owned by the outer stream. */
export const CHAT_STREAM_OPTIONS = { sendReasoning: false, sendStart: false } as const;

/** ADR-005 A15: the server error must arrive before the 60 s of PRD AC-35. */
export const CHAT_TIMEOUT = { totalMs: BUDGETS.chatTotalMs, firstChunkMs: BUDGETS.chatFirstChunkMs } as const;

const MAX_STEPS = 3;

export interface ChatDeps {
  registry: ModelRegistry;
  /** Called once per accepted decision update, with the record to store in the case history. */
  onDecision: (record: ChatUpdateRecord) => void;
  /** Called once with the final assistant message when the turn completed without error. */
  onFinish: (assistant: AppUIMessage) => void;
  /** Called once when the turn failed or was aborted (the route clears `chatBusy` here). Never shown to the customer. */
  onError: (err: unknown) => void;
  /** Defaults to the loaded policy files. */
  getPolicy?: (caseType: CaseType) => Policy;
  now?: () => Date;
  log?: (entry: StageLogEntry) => void;
  timeout?: { totalMs: number; firstChunkMs: number };
}

export interface ChatInput {
  case: Case;
  /** Stored history plus the new user message (AppUIMessage[]). */
  messages: AppUIMessage[];
  signal?: AbortSignal;
}

type Chunk = InferUIMessageChunk<AppUIMessage>;

const stepMetadataSchema = z
  .object({
    openrouter: z.object({
      usage: z.object({
        cost: z.number().optional(),
        costDetails: z.object({ upstreamInferenceCost: z.number().nullish() }).nullish(),
      }),
    }),
  })
  .optional();

/**
 * BYOK keys report `cost: 0` and the real price in `costDetails.upstreamInferenceCost` (ADR-005 A22).
 * Returns null when the provider metadata carries no cost at all.
 */
export function stepCost(providerMetadata: unknown): number | null {
  const parsed = stepMetadataSchema.safeParse(providerMetadata);
  const usage = parsed.success ? parsed.data?.openrouter.usage : undefined;
  if (usage === undefined) return null;
  const cost = usage.cost || usage.costDetails?.upstreamInferenceCost || 0;
  return cost;
}

function errorKind(err: unknown): string {
  if (err instanceof AiTimeoutError) return "timeout";
  if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) return "timeout";
  if (err instanceof Error && /timed? ?out|timeout/i.test(err.message)) return "timeout";
  if (APICallError.isInstance(err)) return "http";
  return "unknown";
}

/**
 * - Tool calls are internal: the client and the stored message only see text and `data-decision` parts.
 * - `streamText` reports its `timeout` (total or first chunk) as an `abort` part, not as an error. When the caller did
 *   not abort, that is a timeout and becomes an error chunk with the generic Polish text.
 */
function customerChunks(callerAborted: () => boolean, onTimeout: (reason: string) => string): TransformStream<Chunk, Chunk> {
  return new TransformStream<Chunk, Chunk>({
    transform(chunk, controller) {
      if (chunk.type === "abort" && !callerAborted()) {
        controller.enqueue({ type: "error", errorText: onTimeout(chunk.reason ?? "timeout") });
        return;
      }
      if (!chunk.type.startsWith("tool-")) controller.enqueue(chunk);
    },
  });
}

/**
 * Chat turn (ADR-002 §3.5): `streamText` with the `updateDecision` tool, merged into one UI message stream.
 * Throws synchronously when the case has no decision or findings (the route must not call it then).
 */
export function createChatStream(deps: ChatDeps, input: ChatInput): ReadableStream<Chunk> {
  const { case: current, messages } = input;
  const policy = (deps.getPolicy ?? getPolicy)(current.form.caseType);
  const prompt = renderChatInstructions(current, policy);
  const now = deps.now ?? ((): Date => new Date());
  const log = deps.log ?? ((entry: StageLogEntry): void => logStage(entry));
  const startedAt = Date.now();

  // Mutated from stream callbacks, so kept in one object (TS cannot narrow `let`s assigned in closures).
  const state: {
    accepted: ChatUpdateRecord | null;
    costCredits: number | null;
    failure: { error: unknown } | null;
    terminal: boolean;
  } = { accepted: null, costCredits: null, failure: null, terminal: false };

  function fail(err: unknown): string {
    state.failure ??= { error: err };
    return pl.chat.error;
  }

  return createUIMessageStream<AppUIMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const updateDecision = createUpdateDecisionTool({
        case: current,
        policy,
        now,
        onAccepted: (record) => {
          state.accepted = record;
          deps.onDecision(record);
        },
        writeDecision: (data) => writer.write({ type: "data-decision", data }),
      });
      const tools = { updateDecision };

      const result = streamText({
        model: deps.registry.languageModel("chat"),
        instructions: prompt.text,
        messages: await convertToModelMessages<AppUIMessage>(messages, { convertDataPart }),
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        timeout: deps.timeout ?? CHAT_TIMEOUT,
        abortSignal: input.signal,
        maxRetries: 0,
        onStepEnd: (step) => {
          const cost = stepCost(step.providerMetadata);
          if (cost !== null) state.costCredits = (state.costCredits ?? 0) + cost;
        },
        // Errors surface as error parts and reach `fail` through toUIMessageStream.
        onError: () => undefined,
      });

      // The outer stream owns the message lifecycle, so the stored message and the client share one id.
      writer.write({ type: "start", messageId: crypto.randomUUID() });
      writer.merge(
        toUIMessageStream<typeof tools, AppUIMessage>({
          stream: result.stream,
          tools,
          sendReasoning: CHAT_STREAM_OPTIONS.sendReasoning,
          sendStart: CHAT_STREAM_OPTIONS.sendStart,
          onError: fail,
          // Stored history is validated with `messageMetadataSchema`, which needs an object on every message.
          messageMetadata: ({ part }) =>
            part.type === "finish"
              ? state.accepted === null
                ? {}
                : { decision: state.accepted.decision, origin: "chat_update", citedRules: state.accepted.citedRules }
              : undefined,
        }).pipeThrough(
          customerChunks(
            () => input.signal?.aborted === true,
            (reason) => fail(new AiTimeoutError(reason)),
          ),
        ),
      );
    },
    onError: fail,
    onEnd: ({ responseMessage, isAborted, isCancelled }) => {
      if (state.terminal) return;
      state.terminal = true;
      const durationMs = Date.now() - startedAt;
      const base = {
        caseId: current.id,
        stage: "chat",
        durationMs,
        model: deps.registry.modelId("chat"),
        promptVersion: prompt.version,
        costCredits: state.costCredits,
      } as const;
      const { failure } = state;
      if (failure === null && !isAborted && isCancelled !== true) {
        log({ ...base, status: "ok", decision: state.accepted?.decision ?? null });
        deps.onFinish(responseMessage);
        return;
      }
      log({ ...base, status: "error", errorKind: failure === null ? "aborted" : errorKind(failure.error) });
      deps.onError(failure === null ? new Error("The chat stream was aborted") : failure.error);
    },
  });
}

/** `createChatStream` as an SSE `Response` for the `/chat` route handler. */
export function streamChat(deps: ChatDeps, input: ChatInput): Response {
  return createUIMessageStreamResponse({ stream: createChatStream(deps, input) });
}
