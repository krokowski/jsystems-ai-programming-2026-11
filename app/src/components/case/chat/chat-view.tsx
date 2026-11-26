"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { AppUIMessage, CaseSummary as CaseSummaryData } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";
import { CaseMessage, hasVisibleText } from "./case-message";
import { CaseSummary } from "./case-summary";

export const MAX_MESSAGE_LENGTH = 2000;

export interface ChatViewProps {
  summary: CaseSummaryData;
  photoUrl: string;
  messages: AppUIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  errorKind: "generic" | "busy" | null;
  onSend: (text: string) => void;
  onRetry: () => void;
  onNewCase: () => void;
}

function showTyping(status: ChatViewProps["status"], messages: AppUIMessage[]): boolean {
  if (status === "submitted") {
    return true;
  }
  if (status !== "streaming") {
    return false;
  }
  const last = messages.at(-1);
  return !(last?.role === "assistant" && hasVisibleText(last));
}

export function ChatView({
  summary,
  photoUrl,
  messages,
  status,
  errorKind,
  onSend,
  onRetry,
  onNewCase,
}: ChatViewProps) {
  const [draft, setDraft] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const canSend = status === "ready" && draft.trim() !== "";

  function handleSubmit({ text }: { text: string }): void {
    setDraft("");
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || status !== "ready") {
      return;
    }
    onSend(trimmed);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-1 flex-col gap-3 px-4 py-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus aria-hidden="true" />
          {pl.chat.newCase}
        </Button>
      </div>

      <CaseSummary summary={summary} photoUrl={photoUrl} />

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 px-0">
          {messages.map((message) => (
            <CaseMessage key={message.id} message={message} />
          ))}

          {showTyping(status, messages) ? (
            <Message from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner role="presentation" aria-hidden="true" />
                  <span>{pl.chat.typing}</span>
                </div>
              </MessageContent>
            </Message>
          ) : null}

          {status === "error" ? (
            <Alert variant="destructive">
              <AlertDescription className="text-destructive">
                {errorKind === "busy" ? pl.chat.busy : pl.chat.error}
              </AlertDescription>
              <div className="mt-2">
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  {pl.chat.retry}
                </Button>
              </div>
            </Alert>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            aria-label={pl.chat.inputLabel}
            placeholder={pl.chat.inputPlaceholder}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
        </PromptInputBody>
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit aria-label={pl.chat.send} disabled={!canSend} />
        </PromptInputFooter>
      </PromptInput>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{pl.chat.newCaseDialog.title}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {pl.chat.newCaseDialog.cancel}
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                setDialogOpen(false);
                onNewCase();
              }}
            >
              {pl.chat.newCaseDialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
