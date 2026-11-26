import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../schemas/enums";
import { pl } from "./index";

describe("i18n-pl", () => {
  it("has the PRD disclaimer", () => {
    expect(pl.decision.disclaimer).toBe(
      "To jest wstępna decyzja. Ostateczna decyzja zostanie podjęta po oględzinach produktu przez nasz serwis.",
    );
  });
  it("category labels follow AC-03 order", () => {
    expect(CATEGORIES.map((c) => pl.form.categoryLabels[c])).toEqual([
      "Smartfon", "Laptop", "Tablet", "Komputer stacjonarny", "Monitor", "Telewizor",
      "Słuchawki / Audio", "Smartwatch / Urządzenie noszone", "Inne",
    ]);
  });
  it("decision labels", () => {
    expect(pl.decision.labels).toEqual({
      approve: "Zaakceptowano", reject: "Odrzucono", manual_review: "Do weryfikacji przez pracownika",
    });
  });
  it("helpers", () => {
    expect(pl.decision.updatedHeader("Odrzucono")).toBe("Zaktualizowana decyzja: Odrzucono");
    expect(pl.decision.rulesLine(["R1.1", "R2.1"])).toBe("Zastosowane zasady: R1.1, R2.1");
    expect(pl.form.reasonCounter(5)).toBe("5 / 2000");
    expect(pl.decision.justificationHeading).toBe("### Uzasadnienie");
    expect(pl.decision.nextStepsHeading).toBe("### Następne kroki");
  });
  it("common keys", () => {
    expect(Object.keys(pl.common).sort()).toEqual(["appSubtitle", "appTitle", "internalError", "intro", "logoAlt"]);
    expect(pl.common.appTitle).toBe("Hardware Service Decision Copilot");
  });
  it("form and caseType labels", () => {
    expect(pl.form.caseTypeLabels).toEqual({ return: "Zwrot", complaint: "Reklamacja" });
    expect(pl.form.errors.purchaseDateFuture).toBe("Data zakupu nie może być z przyszłości");
  });
});
