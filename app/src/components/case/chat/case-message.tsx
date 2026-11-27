import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import type { AppUIMessage, DecisionData } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";
import { DecisionBadge, DecisionIcon, decisionTone } from "./decision-badge";
import { cn } from "@/lib/utils";

// Tailwind preflight strips list markers; restore them for assistant Markdown only.
const LIST_STYLES =
  "[&_ol]:list-decimal [&_ul]:list-disc [&_ol]:list-outside [&_ul]:list-outside [&_ol]:pl-5 [&_ul]:pl-5 [&_ol]:space-y-1 [&_ul]:space-y-1 [&_li]:pl-1 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground";

type Part = AppUIMessage["parts"][number];

function DecisionUpdateBlock({ data }: { data: DecisionData }) {
  return (
    <div
      data-decision={data.decision}
      data-testid="decision-update"
      className={cn("flex flex-col gap-1 rounded-xl px-3 py-2", decisionTone(data.decision))}
    >
      <p className="flex items-center gap-1.5 font-semibold">
        <DecisionIcon decision={data.decision} />
        <span>{pl.decision.updatedHeader(data.label)}</span>
      </p>
      {data.reason ? <p>{data.reason}</p> : null}
    </div>
  );
}

export function hasVisibleText(message: AppUIMessage): boolean {
  return message.parts.some((part) => part.type === "text" && part.text.trim() !== "");
}

function isVisible(part: Part): boolean {
  return (part.type === "text" && part.text.trim() !== "") || part.type === "data-decision";
}

export function CaseMessage({ message }: { message: AppUIMessage }) {
  if (message.role === "user") {
    const text = message.parts
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n");
    return (
      <Message from="user" className="max-w-[85%]">
        <MessageContent className="text-[15px] group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </MessageContent>
      </Message>
    );
  }

  if (message.role !== "assistant" || !message.parts.some(isVisible)) {
    return null;
  }

  const updates = message.parts.flatMap((part) =>
    part.type === "data-decision" && part.data.origin === "chat_update" ? [part.data] : [],
  );

  return (
    <Message from="assistant" className="max-w-[92%] sm:max-w-[85%]">
      <MessageContent
        className="gap-3 text-[15px] leading-relaxed group-[.is-assistant]:rounded-2xl group-[.is-assistant]:rounded-bl-md group-[.is-assistant]:bg-muted group-[.is-assistant]:px-4 group-[.is-assistant]:py-3"
        aria-label={pl.chat.assistantMessage} role="article">
        {updates.map((data, i) => (
          <DecisionUpdateBlock key={`update-${i}`} data={data} />
        ))}
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return part.text.trim() === "" ? null : (
              <MessageResponse key={i} className={LIST_STYLES}>
                {part.text}
              </MessageResponse>
            );
          }
          if (part.type === "data-decision" && part.data.origin === "initial") {
            return (
              <div key={i}>
                <DecisionBadge decision={part.data.decision} label={part.data.label} />
              </div>
            );
          }
          return null;
        })}
        {updates.length > 0 ? (
          <p className="border-t border-border pt-2 text-[13px] text-muted-foreground">
            <em>{pl.decision.disclaimer}</em>
          </p>
        ) : null}
      </MessageContent>
    </Message>
  );
}
