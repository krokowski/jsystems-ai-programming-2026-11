import "server-only";

import { pl } from "@/lib/i18n-pl";
import { chatRequestSchema, type AppUIMessage } from "@/lib/schemas";
import { streamChat } from "@/server/ai/chat/chat-agent";
import type { ChatUpdateRecord } from "@/server/ai/chat/update-decision-tool";
import { getModelRegistry, type ModelRegistry } from "@/server/ai/models";
import { caseState, notFound, validationFailed } from "@/server/errors";

import { getCaseRepository, type Case } from "./repository";
import { requireCase } from "./service";

const MAX_MESSAGE_LENGTH = 2000;
/** ADR-003 4.1: a chat lock older than this is considered stale and released. */
const STALE_LOCK_MS = 90_000;

export interface ChatCaseDeps {
  registry?: ModelRegistry;
  now?: () => Date;
  signal?: AbortSignal;
}

function invalidMessage(): Error {
  return validationFailed({ message: pl.chat.error });
}

function parseRequest(body: unknown): { message: AppUIMessage; text: string } {
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) throw invalidMessage();
  const { message } = parsed.data;
  const text = message.parts.map((part) => part.text).join("");
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) throw invalidMessage();
  return {
    message: { id: message.id, role: "user", parts: [{ type: "text", text }], metadata: {} },
    text,
  };
}

function isLockActive(c: Case, now: Date): boolean {
  if (!c.chatBusy) return false;
  const since = c.chatBusySince === null ? Number.NaN : Date.parse(c.chatBusySince);
  return Number.isFinite(since) && now.getTime() - since < STALE_LOCK_MS;
}

// ADR-003 3.1 / 4.1 / 5.4: validate, take the per-case lock, append the user message once, stream the answer.
export async function chatCase(caseId: string, body: unknown, deps: ChatCaseDeps = {}): Promise<Response> {
  requireCase(caseId);
  const { message } = parseRequest(body);
  const now = deps.now ?? ((): Date => new Date());
  const repo = getCaseRepository();

  // Everything below up to the lock is synchronous, so the check-and-set is atomic within the process.
  let rejection: Error | null = null;
  const locked = repo.update(caseId, (c) => {
    if (c.status !== "decided") {
      rejection = caseState();
      return c;
    }
    if (isLockActive(c, now())) {
      rejection = caseState();
      return c;
    }
    const index = c.messages.findIndex((m) => m.id === message.id);
    if (index !== -1 && index !== c.messages.length - 1) {
      rejection = caseState();
      return c;
    }
    return {
      ...c,
      messages: index === -1 ? [...c.messages, message] : c.messages,
      chatBusy: true,
      chatBusySince: now().toISOString(),
    };
  });
  if (locked === null) throw notFound();
  if (rejection !== null) throw rejection;

  let released = false;
  const release = (patch: (c: Case) => Case = (c) => c): void => {
    if (released) return;
    released = true;
    repo.update(caseId, (c) => ({ ...patch(c), chatBusy: false, chatBusySince: null }));
  };

  try {
    return streamChat(
      {
        registry: deps.registry ?? getModelRegistry(),
        now: deps.now,
        onDecision: (record: ChatUpdateRecord): void => {
          repo.update(caseId, (c) => ({ ...c, decision: record, decisionHistory: [...c.decisionHistory, record] }));
        },
        onFinish: (assistant: AppUIMessage): void => {
          release((c) => ({ ...c, messages: [...c.messages, assistant] }));
        },
        onError: (): void => {
          release();
        },
      },
      { case: locked, messages: locked.messages, signal: deps.signal },
    );
  } catch (err) {
    release();
    throw err;
  }
}
