"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { ChatScreenProps } from "@/components/case/flow/types";
import { apiErrorBodySchema, dataPartSchemas, messageMetadataSchema } from "@/lib/schemas";
import type { AppUIMessage } from "@/lib/schemas";
import { ChatView } from "./chat-view";

export type ChatErrorKind = "generic" | "busy" | "expired";

export function classifyChatError(error: Error | undefined): ChatErrorKind | null {
  if (!error) {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(error.message);
  } catch {
    return "generic";
  }
  const parsed = apiErrorBodySchema.safeParse(raw);
  if (!parsed.success) {
    return "generic";
  }
  if (parsed.data.error.code === "CASE_NOT_FOUND") {
    return "expired";
  }
  if (parsed.data.error.code === "CASE_STATE") {
    return "busy";
  }
  return "generic";
}

export function ChatScreen({
  caseId,
  summary,
  firstMessage,
  photoUrl,
  onDecisionUpdate,
  onNewCase,
  onExpired,
}: ChatScreenProps) {
  // Keep the latest callback without recreating the chat when the parent re-renders.
  const decisionUpdateRef = useRef(onDecisionUpdate);
  useEffect(() => {
    decisionUpdateRef.current = onDecisionUpdate;
  }, [onDecisionUpdate]);

  const [transport] = useState(
    () =>
      new DefaultChatTransport<AppUIMessage>({
        api: `/api/cases/${caseId}/chat`,
        prepareSendMessagesRequest: ({ messages, trigger }) => ({
          body: { message: messages[messages.length - 1], trigger },
        }),
      }),
  );

  const { messages, status, error, sendMessage, regenerate } = useChat<AppUIMessage>({
    id: caseId,
    messages: [firstMessage],
    dataPartSchemas,
    messageMetadataSchema,
    transport,
    onData: (part) => {
      if (part.type === "data-decision") {
        decisionUpdateRef.current(part.data.decision, part.data.label);
      }
    },
  });

  const kind = classifyChatError(error);

  useEffect(() => {
    if (kind === "expired") {
      onExpired();
    }
  }, [kind, onExpired]);

  return (
    <ChatView
      summary={summary}
      photoUrl={photoUrl}
      messages={messages}
      status={status}
      errorKind={kind === "busy" ? "busy" : kind === null ? null : "generic"}
      onSend={(text) => {
        void sendMessage({ text });
      }}
      onRetry={() => {
        void regenerate();
      }}
      onNewCase={onNewCase}
    />
  );
}
