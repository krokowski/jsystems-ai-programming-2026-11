import { describe, expect, it } from "vitest";
import { createCaseFormSchema, fieldErrorsFromZod } from "./case-form";

const schema = createCaseFormSchema({ today: "2026-11-26" });
const base = {
  caseType: "return",
  category: "laptop",
  productName: "ThinkPad X1",
  purchaseDate: "2026-11-20",
  reason: "",
};

function messages(input: unknown): Array<{ path: string; message: string }> {
  const r = schema.safeParse(input);
  if (r.success) return [];
  return r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

describe("case form schema", () => {
  it("accepts a valid return without reason", () => {
    expect(schema.safeParse(base).success).toBe(true);
    const { reason: _reason, ...noReason } = base;
    const r = schema.safeParse(noReason);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBe("");
  });

  it("validates productName length after trim", () => {
    const msg = "Nazwa produktu musi mieć od 2 do 100 znaków.";
    expect(messages({ ...base, productName: "a" })).toEqual([{ path: "productName", message: msg }]);
    expect(messages({ ...base, productName: "  a  " })[0]?.message).toBe(msg);
    expect(messages({ ...base, productName: "ab" })).toEqual([]);
    expect(messages({ ...base, productName: "x".repeat(100) })).toEqual([]);
    expect(messages({ ...base, productName: "x".repeat(101) })[0]?.message).toBe(msg);
    const r = schema.safeParse({ ...base, productName: "  ab " });
    expect(r.success && r.data.productName).toBe("ab");
  });

  it("requires a 10 char reason for complaints", () => {
    const c = { ...base, caseType: "complaint" };
    expect(messages({ ...c, reason: "123456789" })).toEqual([
      { path: "reason", message: "Opis usterki musi mieć co najmniej 10 znaków." },
    ]);
    expect(messages({ ...c, reason: "1234567890" })).toEqual([]);
    expect(messages({ ...c, reason: "" })[0]?.path).toBe("reason");
  });

  it("limits reason to 2000", () => {
    expect(messages({ ...base, reason: "x".repeat(2000) })).toEqual([]);
    expect(messages({ ...base, reason: "x".repeat(2001) })).toEqual([
      { path: "reason", message: "Powód może mieć najwyżej 2000 znaków." },
    ]);
  });

  it("validates purchaseDate", () => {
    expect(messages({ ...base, purchaseDate: "2026-11-27" })).toEqual([
      { path: "purchaseDate", message: "Data zakupu nie może być z przyszłości" },
    ]);
    expect(messages({ ...base, purchaseDate: "2026-11-26" })).toEqual([]);
    const invalid = "Podaj prawidłową datę zakupu.";
    expect(messages({ ...base, purchaseDate: "1989-12-31" })[0]?.message).toBe(invalid);
    expect(messages({ ...base, purchaseDate: "2026-02-30" })[0]?.message).toBe(invalid);
    expect(messages({ ...base, purchaseDate: "abc" })[0]?.message).toBe(invalid);
    expect(messages({ ...base, purchaseDate: "" })[0]?.message).toBe("Wybierz datę zakupu.");
  });

  it("reports missing caseType and category", () => {
    const { caseType: _c, category: _k, ...rest } = base;
    const m = messages(rest);
    expect(m).toContainEqual({ path: "caseType", message: "Wybierz rodzaj zgłoszenia." });
    expect(m).toContainEqual({ path: "category", message: "Wybierz kategorię sprzętu." });
    expect(messages({ ...base, caseType: "", category: "" })).toHaveLength(2);
  });

  it("fieldErrorsFromZod gives one message per field", () => {
    const r = schema.safeParse({ ...base, productName: "", purchaseDate: "", caseType: "complaint", reason: "x" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrorsFromZod(r.error);
      expect(Object.keys(e).sort()).toEqual(["productName", "purchaseDate", "reason"]);
      expect(e.purchaseDate).toBe("Wybierz datę zakupu.");
    }
  });
});
