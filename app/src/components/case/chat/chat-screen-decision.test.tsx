import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUIMessage, CaseSummary } from "@/lib/schemas";
import { ChatScreen } from "./chat-screen";

// useChat is replaced so the test can drive `onData` / `onFinish` directly. The assertions are about
// when ChatScreen reports a decision update to the flow, not about stream parsing (that is the SDK's job).
interface FinishEvent {
  isError: boolean;
  isAbort: boolean;
  isDisconnect: boolean;
}
interface CapturedOptions {
  onData?: (part: { type: string; data: { decision: string; label: string } }) => void;
  onFinish?: (event: FinishEvent) => void;
  onError?: (error: Error) => void;
}
const captured: { options: CapturedOptions } = { options: {} };

vi.mock("@ai-sdk/react", () => ({
  useChat: (options: CapturedOptions) => {
    captured.options = options;
    return { messages: [], status: "ready", error: undefined, sendMessage: vi.fn(), regenerate: vi.fn() };
  },
}));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const summary: CaseSummary = {
  caseType: "complaint",
  category: "smartphone",
  productName: "Galaxy S24",
  purchaseDate: "2026-09-01",
  thumbnailDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  decision: "manual_review",
  decisionLabel: "Do weryfikacji",
};
const firstMessage: AppUIMessage = { id: "first", role: "assistant", parts: [{ type: "text", text: "Dzień dobry" }], metadata: {} };

const decisionPart = { type: "data-decision", data: { decision: "approve", label: "Zaakceptowano" } };
const ok: FinishEvent = { isError: false, isAbort: false, isDisconnect: false };

function mount(onDecisionUpdate: (decision: string, label: string) => void): void {
  render(
    <ChatScreen
      caseId="case-1"
      summary={summary}
      firstMessage={firstMessage}
      photoUrl="blob:test/1"
      onDecisionUpdate={onDecisionUpdate}
      onNewCase={() => undefined}
      onExpired={() => undefined}
    />,
  );
}

describe("ChatScreen decision update commit rule", () => {
  beforeEach(() => {
    captured.options = {};
  });

  it("does not apply a data-decision until the turn has finished", () => {
    const update = vi.fn();
    mount(update);
    captured.options.onData?.(decisionPart);
    expect(update).not.toHaveBeenCalled();
    captured.options.onFinish?.(ok);
    expect(update).toHaveBeenCalledExactlyOnceWith("approve", "Zaakceptowano");
  });

  it.each([
    ["error", { isError: true, isAbort: false, isDisconnect: false }],
    ["abort", { isError: false, isAbort: true, isDisconnect: false }],
    ["disconnect", { isError: false, isAbort: false, isDisconnect: true }],
  ] as const)("drops the pending decision when the turn ends with %s", (_name, event) => {
    const update = vi.fn();
    mount(update);
    captured.options.onData?.(decisionPart);
    captured.options.onFinish?.(event);
    expect(update).not.toHaveBeenCalled();
    // A later successful turn without a data-decision must not resurrect the dropped one.
    captured.options.onFinish?.(ok);
    expect(update).not.toHaveBeenCalled();
  });

  it("drops the pending decision when the request itself fails", () => {
    const update = vi.fn();
    mount(update);
    captured.options.onData?.(decisionPart);
    captured.options.onError?.(new Error("network"));
    captured.options.onFinish?.(ok);
    expect(update).not.toHaveBeenCalled();
  });
});
