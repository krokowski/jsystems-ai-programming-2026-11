import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
