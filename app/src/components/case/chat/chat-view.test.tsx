import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AppUIMessage, CaseSummary, Decision } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";
import { composeFirstMessage } from "@/server/ai/decision/first-message";
import { ChatView, type ChatViewProps } from "./chat-view";

vi.mock("server-only", () => ({}));

// jsdom lacks ResizeObserver, which use-stick-to-bottom (Conversation) needs.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const summary: CaseSummary = {
  caseType: "return",
  category: "smartphone",
  productName: "Galaxy S24",
  purchaseDate: "2026-11-03",
  thumbnailDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  decision: "approve",
  decisionLabel: "Zaakceptowano",
};

function firstMessage(decision: Decision = "approve"): AppUIMessage {
  return composeFirstMessage(
    {
      origin: "initial",
      decision,
      modelDecision: decision,
      forcedBy: null,
      createdAt: "2026-11-26T10:00:00.000Z",
      greeting: "Dzień dobry, przejrzałem Twoje zgłoszenie.",
      justification: "Produkt spełnia warunki zwrotu.",
      citedRules: ["R1.1", "R2.1"],
      nextSteps: ["Spakuj produkt", "Wydrukuj etykietę", "Nadaj paczkę"],
    },
    "first",
  );
}

function updateMessage(): AppUIMessage {
  return {
    id: "update",
    role: "assistant",
    parts: [
      { type: "text", text: "Po wyjaśnieniu zmieniam rozstrzygnięcie." },
      {
        type: "data-decision",
        data: {
          decision: "approve",
          label: "Zaakceptowano",
          origin: "chat_update",
          reason: "Klient dostarczył dowód zakupu.",
        },
      },
    ],
  };
}

function userMessage(text: string): AppUIMessage {
  return { id: `u-${text}`, role: "user", parts: [{ type: "text", text }] };
}

function setup(overrides: Partial<ChatViewProps> = {}) {
  const props: ChatViewProps = {
    summary,
    photoUrl: "blob:photo",
    messages: [firstMessage()],
    status: "ready",
    errorKind: null,
    onSend: vi.fn(),
    onRetry: vi.fn(),
    onNewCase: vi.fn(),
    ...overrides,
  };
  const user = userEvent.setup();
  render(<ChatView {...props} />);
  return { props, user };
}

const input = () => screen.getByRole("textbox", { name: pl.chat.inputLabel });

describe("ChatView first message", () => {
  it("renders greeting, in-place badge, headings, ordered steps and the disclaimer last", () => {
    setup();
    const message = screen.getByLabelText(pl.chat.assistantMessage);

    expect(within(message).getByText(/Dzień dobry/)).toBeInTheDocument();
    const badge = within(message).getByText("Zaakceptowano").closest("[data-decision]");
    expect(badge).toHaveAttribute("data-decision", "approve");
    expect(message).toHaveTextContent(`${pl.decision.badgePrefix} Zaakceptowano`);
    expect(within(message).getByText("Uzasadnienie")).toBeInTheDocument();
    expect(within(message).getByText("Następne kroki")).toBeInTheDocument();

    const list = within(message).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);

    expect(message.textContent).not.toMatch(/\*\*|###/);
    const disclaimer = within(message).getByText(pl.decision.disclaimer);
    expect(disclaimer.closest("em")).not.toBeNull();
    expect(message.lastElementChild?.contains(disclaimer)).toBe(true);
    expect(within(message).getAllByText(pl.decision.disclaimer)).toHaveLength(1);
  });

  it.each([
    ["approve", "Zaakceptowano"],
    ["reject", "Odrzucono"],
    ["manual_review", "Do weryfikacji przez pracownika"],
  ] as const)("shows data-decision %s with its label", (decision, label) => {
    setup({ messages: [firstMessage(decision)] });
    const message = screen.getByLabelText(pl.chat.assistantMessage);
    const badge = within(message).getByText(label).closest("[data-decision]");
    expect(badge).toHaveAttribute("data-decision", decision);
  });
});

describe("ChatView message rendering", () => {
  it("renders the update block before the text and the disclaimer last", () => {
    setup({ messages: [updateMessage()] });
    const message = screen.getByLabelText(pl.chat.assistantMessage);
    const header = within(message).getByText(pl.decision.updatedHeader("Zaakceptowano"));
    const text = within(message).getByText(/Po wyjaśnieniu/);
    const disclaimer = within(message).getByText(pl.decision.disclaimer);

    expect(within(message).getByText("Klient dostarczył dowód zakupu.")).toBeInTheDocument();
    expect(header.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(text.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disclaimer.closest("em")).not.toBeNull();
    expect(message.lastElementChild?.contains(disclaimer)).toBe(true);
  });

  it("does not render reasoning or tool parts", () => {
    const message: AppUIMessage = {
      id: "m",
      role: "assistant",
      parts: [
        { type: "reasoning", text: "ukryte rozumowanie" },
        {
          type: "tool-updateDecision",
          toolCallId: "t1",
          state: "output-available",
          input: { decision: "approve" },
          output: { ok: true },
        } as never,
        { type: "text", text: "Widoczna odpowiedź" },
      ],
    };
    setup({ messages: [message] });
    expect(screen.getByText("Widoczna odpowiedź")).toBeInTheDocument();
    expect(screen.queryByText("ukryte rozumowanie")).not.toBeInTheDocument();
    expect(screen.queryByText(/updateDecision/)).not.toBeInTheDocument();
  });

  it("renders user text as plain text", () => {
    setup({ messages: [firstMessage(), userMessage("**pogrubione**\nlinia")] });
    const text = screen.getByText(/\*\*pogrubione\*\*/);
    expect(text).toHaveClass("whitespace-pre-wrap");
    expect(text.querySelector("strong")).toBeNull();
  });
});

describe("ChatView input", () => {
  it("sends on Enter once with the typed text", async () => {
    const { props, user } = setup();
    await user.type(input(), "tekst{Enter}");
    expect(props.onSend).toHaveBeenCalledTimes(1);
    expect(props.onSend).toHaveBeenCalledWith("tekst");
  });

  it("inserts a newline on Shift+Enter without sending", async () => {
    const { props, user } = setup();
    await user.type(input(), "a{Shift>}{Enter}{/Shift}b");
    expect(props.onSend).not.toHaveBeenCalled();
    expect(input()).toHaveValue("a\nb");
  });

  it("does not send whitespace-only text", async () => {
    const { props, user } = setup();
    await user.type(input(), "   {Enter}");
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("disables submit and ignores Enter while streaming", async () => {
    const { props, user } = setup({ status: "streaming" });
    expect(screen.getByRole("button", { name: pl.chat.send })).toBeDisabled();
    await user.type(input(), "tekst{Enter}");
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("limits the message to 2000 characters and has a Polish placeholder", () => {
    setup();
    expect(input()).toHaveAttribute("maxlength", "2000");
    expect(input()).toHaveAttribute("placeholder", pl.chat.inputPlaceholder);
  });

  it("has no attachment controls", () => {
    setup();
    expect(screen.queryByRole("button", { name: /załącz|attach|add/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: pl.chat.send })).toHaveLength(1);
  });
});

describe("ChatView status", () => {
  it("shows the typing indicator while submitted", () => {
    setup({ status: "submitted", messages: [firstMessage(), userMessage("pytanie")] });
    expect(screen.getByText(pl.chat.typing)).toBeInTheDocument();
  });

  it("shows the typing indicator while streaming before any visible text", () => {
    const empty: AppUIMessage = { id: "a", role: "assistant", parts: [] };
    setup({ status: "streaming", messages: [firstMessage(), userMessage("pytanie"), empty] });
    expect(screen.getByText(pl.chat.typing)).toBeInTheDocument();
  });

  it("hides the typing indicator once the reply has text", () => {
    const partial: AppUIMessage = {
      id: "a",
      role: "assistant",
      parts: [{ type: "text", text: "Zaczynam odpowiadać" }],
    };
    setup({ status: "streaming", messages: [firstMessage(), userMessage("pytanie"), partial] });
    expect(screen.queryByText(pl.chat.typing)).not.toBeInTheDocument();
  });

  it("shows the error with Ponów on error", async () => {
    const { props, user } = setup({
      status: "error",
      errorKind: "generic",
      messages: [firstMessage(), userMessage("pytanie")],
    });
    expect(screen.getByText(pl.chat.error)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: pl.chat.retry }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the busy text for errorKind busy", () => {
    setup({ status: "error", errorKind: "busy", messages: [firstMessage(), userMessage("x")] });
    expect(screen.getByText(pl.chat.busy)).toBeInTheDocument();
    expect(screen.queryByText(pl.chat.error)).not.toBeInTheDocument();
  });
});

describe("ChatView new case dialog", () => {
  it("cancels without calling and confirms once", async () => {
    const { props, user } = setup();
    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(pl.chat.newCaseDialog.title)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: pl.chat.newCaseDialog.cancel }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(props.onNewCase).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    const again = await screen.findByRole("dialog");
    await user.click(within(again).getByRole("button", { name: pl.chat.newCaseDialog.confirm }));
    expect(props.onNewCase).toHaveBeenCalledTimes(1);
  });
});

describe("CaseSummary", () => {
  it("shows labels, date and the current decision", () => {
    setup();
    expect(screen.getAllByText("Smartfon").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Galaxy S24").length).toBeGreaterThan(0);
    expect(screen.getAllByText("03.11.2026").length).toBeGreaterThan(0);
    expect(screen.getByTestId("summary-decision")).toHaveTextContent("Zaakceptowano");
  });

  it("opens the full photo in a dialog from the thumbnail", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: pl.chat.showDetails }));
    await user.click(screen.getByRole("button", { name: pl.chat.photoThumbnail }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(pl.chat.photoDialogTitle)).toBeInTheDocument();
    expect(dialog.querySelector("img")).toHaveAttribute("src", "blob:photo");
  });

  it("has a working details toggle", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("button", { name: pl.chat.showDetails });
    await user.click(toggle);
    expect(screen.getByRole("button", { name: pl.chat.hideDetails })).toBeInTheDocument();
  });
});
