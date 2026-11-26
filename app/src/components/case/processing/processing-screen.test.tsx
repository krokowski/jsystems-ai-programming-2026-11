import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pl } from "@/lib/i18n-pl";
import { ProcessingScreen } from "./processing-screen";

const analysisLabel = pl.processing.steps.analysis;
const decisionLabel = pl.processing.steps.decision;

function stepItem(label: string): HTMLElement {
  const item = screen.getByText(label).closest("li");
  if (!item) {
    throw new Error(`No list item for step "${label}"`);
  }
  return item;
}

describe("ProcessingScreen", () => {
  it("marks the analysis step as current while the analysis runs", () => {
    render(
      <ProcessingScreen step="analysis" failed={false} onRetry={vi.fn()} onBack={vi.fn()} />
    );

    expect(stepItem(analysisLabel)).toHaveAttribute("aria-current", "step");
    expect(stepItem(decisionLabel)).not.toHaveAttribute("aria-current");
    expect(screen.getByText(analysisLabel)).toBeVisible();
    expect(screen.getByText(decisionLabel)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("marks the analysis step as done and the decision step as current", () => {
    render(
      <ProcessingScreen step="decision" failed={false} onRetry={vi.fn()} onBack={vi.fn()} />
    );

    const analysis = stepItem(analysisLabel);
    expect(analysis).not.toHaveAttribute("aria-current");
    expect(within(analysis).getByText("(zakończono)")).toBeInTheDocument();
    expect(stepItem(decisionLabel)).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error message and both actions when failed", () => {
    render(
      <ProcessingScreen step="analysis" failed={true} onRetry={vi.fn()} onBack={vi.fn()} />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(pl.processing.error);
    expect(screen.getByRole("button", { name: pl.processing.retry })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: pl.processing.backToForm })).toBeInTheDocument();
  });

  it("replaces the spinner with an error icon on the failed step", () => {
    const { container } = render(
      <ProcessingScreen step="decision" failed={true} onRetry={vi.fn()} onBack={vi.fn()} />
    );

    expect(stepItem(decisionLabel).querySelector('[data-slot="spinner"]')).toBeNull();
    expect(container.querySelector('[data-slot="spinner"]')).toBeNull();
    expect(stepItem(decisionLabel)).toHaveAttribute("aria-current", "step");
  });

  it("calls onRetry once when the retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onBack = vi.fn();
    render(<ProcessingScreen step="analysis" failed={true} onRetry={onRetry} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: pl.processing.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it("calls onBack once when the back-to-form button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onBack = vi.fn();
    render(<ProcessingScreen step="analysis" failed={true} onRetry={onRetry} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: pl.processing.backToForm }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("moves focus to the retry button when the error appears", () => {
    render(
      <ProcessingScreen step="analysis" failed={true} onRetry={vi.fn()} onBack={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: pl.processing.retry })).toHaveFocus();
  });

  it("announces step changes through a polite live region", () => {
    render(
      <ProcessingScreen step="analysis" failed={false} onRetry={vi.fn()} onBack={vi.fn()} />
    );

    const region = document.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region).toContainElement(screen.getByText(analysisLabel));
    expect(region).toContainElement(screen.getByText(decisionLabel));
  });
});
