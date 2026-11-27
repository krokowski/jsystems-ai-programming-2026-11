import "server-only";

import { describe, expect, it } from "vitest";

import { convertDataPart } from "./convert-data-part";

describe("convertDataPart", () => {
  it("turns data-decision into a one-line text for the model", () => {
    expect(
      convertDataPart({
        type: "data-decision",
        data: { decision: "manual_review", label: "Do weryfikacji przez pracownika", origin: "initial" },
      }),
    ).toEqual({ type: "text", text: "[Decision: manual_review — origin: initial]" });
    expect(
      convertDataPart({
        type: "data-decision",
        data: { decision: "approve", label: "Zaakceptowano", origin: "chat_update", reason: "Nowe fakty." },
      }),
    ).toEqual({ type: "text", text: "[Decision: approve — origin: chat_update]" });
  });
});
