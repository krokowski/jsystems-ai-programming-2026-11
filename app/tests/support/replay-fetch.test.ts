import { describe, expect, it } from "vitest";
import { hangingFetch, loadCapture, replayFetch } from "./replay-fetch";

describe("replayFetch (TR4 capture replay)", () => {
  it("replays a captured JSON body and status, and records the request", async () => {
    const capture = loadCapture("s5-decision.json");
    const replay = replayFetch([{ capture }]);
    const res = await replay.fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "m" }),
    });
    expect(res.status).toBe(capture.response.status);
    expect(await res.json()).toEqual(capture.response.body);
    expect(replay.calls).toEqual([
      { url: "https://openrouter.ai/api/v1/chat/completions", method: "POST", body: { model: "m" } },
    ]);
  });

  it("replays raw SSE text verbatim", async () => {
    const capture = loadCapture("s5-chat-stream.json");
    const res = await replayFetch([{ capture }]).fetch("https://x", { method: "POST" });
    expect(await res.text()).toBe(capture.response.rawText);
  });

  it("throws instead of inventing a response when captures run out", async () => {
    const replay = replayFetch([]);
    await expect(replay.fetch("https://x")).rejects.toThrow(/no capture left/);
  });

  it("hangingFetch rejects only when aborted", async () => {
    const controller = new AbortController();
    const pending = hangingFetch().fetch("https://x", { signal: controller.signal });
    controller.abort(new DOMException("timeout", "TimeoutError"));
    await expect(pending).rejects.toThrow("timeout");
  });
});
