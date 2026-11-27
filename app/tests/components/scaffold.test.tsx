import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ui project (jsdom)", () => {
  it("renders a component and has the jest-dom matchers registered", () => {
    render(<button type="button">Wyślij</button>);
    expect(screen.getByRole("button", { name: "Wyślij" })).toBeInTheDocument();
  });
});
