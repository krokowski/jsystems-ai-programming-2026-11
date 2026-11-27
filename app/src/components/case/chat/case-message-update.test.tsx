import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dataPartSchemas, messageMetadataSchema, type AppUIMessage } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";
import { validateUIMessages } from "ai";
import updatedDecisionMessage from "../../../../tests/fixtures/chat/updated-decision-message.json";
import { CaseMessage } from "./case-message";

// The fixture is the assistant message produced by the real ChatAgent (T35) on the replay of
// s5-chat-stream.json + s5-chat-followup-accepted.json. Only the rendering is asserted here,
// never the model wording.
async function loadFixture(): Promise<AppUIMessage> {
  const [message] = await validateUIMessages<AppUIMessage>({
    messages: [updatedDecisionMessage],
    metadataSchema: messageMetadataSchema,
    dataSchemas: dataPartSchemas,
  });
  if (message === undefined) throw new Error("fixture has no message");
  return message;
}

describe("CaseMessage with a decision update produced by the real ChatAgent (ADR-005 A5)", () => {
  it("renders the update block first and the disclaimer as the last element", async () => {
    const message = await loadFixture();
    const { container } = render(<CaseMessage message={message} />);

    const heading = screen.getByText(pl.decision.updatedHeader(pl.decision.labels.approve));
    const disclaimer = screen.getByText(pl.decision.disclaimer);
    const textNodes = Array.from(container.querySelectorAll("p, li, h1, h2, h3, h4, em"));
    expect(textNodes.length).toBeGreaterThan(2);

    // The update header precedes every model text node, and the disclaimer follows them.
    expect(heading.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const lastText = textNodes[textNodes.length - 1];
    expect(lastText === disclaimer || lastText?.contains(disclaimer) || disclaimer.contains(lastText ?? disclaimer)).toBe(true);
  });

  it("does not render step-start or tool parts", async () => {
    const message = await loadFixture();
    render(<CaseMessage message={message} />);
    expect(screen.queryByText(/updateDecision/)).toBeNull();
    expect(screen.queryByText(/step-start/)).toBeNull();
  });
});
