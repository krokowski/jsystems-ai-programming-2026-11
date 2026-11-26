import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { pl } from "@/lib/i18n-pl";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("renders the Asseco logo, the app title and the subtitle", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("img", { name: pl.common.logoAlt })).toBeInTheDocument();
    expect(screen.getByText(pl.common.appTitle)).toBeInTheDocument();
    expect(screen.getByText(pl.common.appSubtitle)).toBeInTheDocument();
  });

  it("renders the actions slot content when given", () => {
    render(<SiteHeader actions={<button type="button">Nowe zgłoszenie</button>} />);

    expect(screen.getByRole("button", { name: "Nowe zgłoszenie" })).toBeInTheDocument();
  });

  it("scrolls a focused field out from under the header, together with its legend", async () => {
    const scrollBy = vi.fn();
    vi.stubGlobal("scrollBy", scrollBy);
    const rect = (top: number, height: number): DOMRect => new DOMRect(0, top, 100, height);
    render(
      <>
        <SiteHeader />
        <fieldset data-testid="fs">
          <legend>Legenda</legend>
          <input aria-label="pole" />
        </fieldset>
      </>,
    );
    vi.spyOn(screen.getByRole("banner"), "getBoundingClientRect").mockReturnValue(rect(0, 67));
    vi.spyOn(screen.getByText("Legenda"), "getBoundingClientRect").mockReturnValue(rect(30, 20));
    vi.spyOn(screen.getByTestId("fs"), "getBoundingClientRect").mockReturnValue(rect(50, 200));

    screen.getByLabelText("pole").focus();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(scrollBy).toHaveBeenCalledWith({ top: 30 - (67 + 16) });
    vi.unstubAllGlobals();
  });
});
