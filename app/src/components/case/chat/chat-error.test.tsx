import { describe, expect, it } from "vitest";
import { classifyChatError } from "./chat-screen";

const body = (code: string): Error =>
  new Error(JSON.stringify({ error: { code, message: "x" } }));

describe("classifyChatError", () => {
  it.each([
    [undefined, null],
    [body("CASE_NOT_FOUND"), "expired"],
    [body("CASE_STATE"), "busy"],
    [body("AI_UNAVAILABLE"), "generic"],
    [new Error("<html>404</html>"), "generic"],
    [new Error(JSON.stringify({ foo: 1 })), "generic"],
  ])("maps %s to %s", (error, expected) => {
    expect(classifyChatError(error)).toBe(expected);
  });
});
