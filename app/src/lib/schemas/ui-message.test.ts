import { describe, expect, it } from "vitest";
import { dataPartSchemas, decisionDataSchema } from "./ui-message";

describe("ui-message schemas", () => {
  it("decisionDataSchema has no disclaimer", () => {
    expect(Object.keys(decisionDataSchema.shape)).toEqual(["decision", "label", "origin", "reason"]);
  });
  it("exposes decision data part schema", () => {
    expect(dataPartSchemas.decision).toBe(decisionDataSchema);
  });
});
