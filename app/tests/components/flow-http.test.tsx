import { readFileSync } from "node:fs";
import path from "node:path";
import { StrictMode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaseFlow } from "@/components/case/flow/case-flow";
import { pl } from "@/lib/i18n-pl";
import { z } from "zod";

const CAPTURES_DIR = path.resolve(process.cwd(), "tests/fixtures/captures");

// api-* captures (T45) have no `spike` field, so tests/support/replay-fetch.ts `loadCapture` rejects them.
const captureSchema = z.object({
  response: z.object({
    status: z.number(),
    headers: z.record(z.string(), z.string()),
    body: z.unknown().optional(),
    rawText: z.string().optional(),
  }),
});
type Capture = z.infer<typeof captureSchema>;

function loadCapture(fileName: string): Capture {
  const raw: unknown = JSON.parse(readFileSync(path.join(CAPTURES_DIR, fileName), "utf8"));
  return captureSchema.parse(raw);
}

// jsdom lacks ResizeObserver, which use-stick-to-bottom (Conversation) needs.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const PHOTO_BYTES = readFileSync(path.resolve(process.cwd(), "../assets/example-images/phone-1.jpg"));
const CASE_ID = "124eecd5-2a2d-456b-b40a-13f3f7e45001";

interface Recorded {
  url: string;
  method: string;
  body: unknown;
}

type RouteKey = "create" | "analysis" | "decision" | "chat";

/** Builds a Response from a T45 capture: status, headers and body / rawText verbatim. */
function toResponse(capture: Capture): Response {
  const { status, headers, body, rawText } = capture.response;
  const replayHeaders = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower === "content-length" || lower === "content-encoding" || lower === "transfer-encoding") continue;
    replayHeaders.set(name, value);
  }
  return new Response(rawText ?? JSON.stringify(body), { status, headers: replayHeaders });
}

function routeOf(url: string): RouteKey | null {
  const { pathname } = new URL(url, "http://localhost");
  if (pathname === "/api/cases") return "create";
  const match = /^\/api\/cases\/[^/]+\/(analysis|decision|chat)$/.exec(pathname);
  if (!match) return null;
  const key = match[1];
  return key === "analysis" || key === "decision" || key === "chat" ? key : null;
}

function describeBody(body: unknown): unknown {
  if (body instanceof FormData) {
    const fields: Record<string, string> = {};
    for (const [name, value] of body.entries()) {
      fields[name] = typeof value === "string" ? value : `file:${value.name}:${value.size}`;
    }
    return fields;
  }
  if (typeof body === "string") {
    try {
      const parsed: unknown = JSON.parse(body);
      return parsed;
    } catch {
      return body;
    }
  }
  return body ?? null;
}

/** Answers by route; each route consumes its capture queue in order, the last one repeats. */
function installRouter(routes: Partial<Record<RouteKey, readonly string[]>>): Recorded[] {
  const calls: Recorded[] = [];
  const used: Record<string, number> = {};
  const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: describeBody(init?.body) });
    if (init?.signal?.aborted) throw init.signal.reason ?? new DOMException("aborted", "AbortError");
    const key = routeOf(url);
    const queue = key ? routes[key] : undefined;
    if (!key || !queue || queue.length === 0) throw new Error(`unexpected ${method} ${url}`);
    const index = Math.min(used[key] ?? 0, queue.length - 1);
    used[key] = (used[key] ?? 0) + 1;
    const fileName = queue[index];
    if (fileName === undefined) throw new Error(`no capture for ${key}`);
    return toResponse(loadCapture(fileName));
  });
  vi.stubGlobal("fetch", fetchStub);
  return calls;
}

let urlCounter = 0;
beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => `blob:test/${urlCounter++}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

type User = ReturnType<typeof userEvent.setup>;

async function fillAndSubmit(user: User): Promise<void> {
  await user.click(screen.getByRole("radio", { name: /Zwrot/ }));
  await user.click(screen.getByRole("combobox", { name: pl.form.categoryLabel }));
  await user.click(await screen.findByRole("option", { name: "Smartfon" }));
  await user.type(screen.getByLabelText(pl.form.productNameLabel), "Galaxy S24");
  await user.click(screen.getByRole("button", { name: /Data zakupu/ }));
  const day = document.querySelector<HTMLElement>('[data-iso="2026-11-23"]');
  if (!day) throw new Error("no day 2026-11-23 in the calendar");
  await user.click(day);
  await user.upload(
    screen.getByLabelText(pl.form.photoLabel),
    new File([new Uint8Array(PHOTO_BYTES)], "phone-1.jpg", { type: "image/jpeg" }),
  );
  await screen.findByText("phone-1.jpg");
  await user.click(screen.getByRole("button", { name: pl.form.submit }));
}

function setup(strict = false) {
  const user = userEvent.setup({ applyAccept: false });
  const ui = strict ? (
    <StrictMode>
      <CaseFlow />
    </StrictMode>
  ) : (
    <CaseFlow />
  );
  render(ui);
  return user;
}

const OK_FLOW = {
  create: ["api-create-201.json"],
  analysis: ["api-analysis-200-auto.json"],
  decision: ["api-decision-200.json"],
} as const;

const callsTo = (calls: Recorded[], suffix: string): Recorded[] =>
  calls.filter((c) => new URL(c.url, "http://localhost").pathname.endsWith(suffix));

describe("CaseFlow over captured HTTP responses", () => {
  it("runs the whole flow: form -> processing -> chat", async () => {
    const calls = installRouter(OK_FLOW);
    const user = setup();
    await fillAndSubmit(user);

    const message = await screen.findByLabelText(pl.chat.assistantMessage, undefined, { timeout: 5000 });
    expect(within(message).getByText(pl.decision.disclaimer)).toBeInTheDocument();
    expect(screen.getByTestId("summary-decision")).toHaveTextContent("Do weryfikacji przez pracownika");

    expect(calls.map((c) => `${c.method} ${new URL(c.url, "http://localhost").pathname}`)).toEqual([
      "POST /api/cases",
      `POST /api/cases/${CASE_ID}/analysis`,
      `POST /api/cases/${CASE_ID}/decision`,
    ]);
    expect(calls[0]?.body).toMatchObject({
      caseType: "return",
      category: "smartphone",
      productName: "Galaxy S24",
      purchaseDate: "2026-11-23",
      photo: expect.stringContaining("file:phone-1.jpg:"),
    });
  });

  it("shows both processing steps while the requests run", async () => {
    let releaseAnalysis: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseAnalysis = resolve;
    });
    const calls = installRouter(OK_FLOW);
    const inner = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/analysis")) await gate;
      return inner(input, init);
    });
    const user = setup();
    await fillAndSubmit(user);
    const region = await screen.findByText(pl.processing.steps.analysis);
    expect(region.closest("[aria-live='polite']")).not.toBeNull();
    expect(callsTo(calls, "/decision")).toHaveLength(0);
    releaseAnalysis();
    await screen.findByLabelText(pl.chat.assistantMessage, undefined, { timeout: 5000 });
  });

  it("maps a server 422 to the matching fields and keeps the values", async () => {
    installRouter({ create: ["api-create-422.json"] });
    const user = setup();
    await fillAndSubmit(user);

    const name = screen.getByLabelText(pl.form.productNameLabel);
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(await screen.findByText(pl.form.errors.productNameLength)).toBeInTheDocument();
    expect(screen.getByText(pl.form.errors.purchaseDateFuture)).toBeInTheDocument();
    expect(screen.getByText(pl.form.errors.photoFormat)).toBeInTheDocument();
    expect(name).toHaveValue("Galaxy S24");
    expect(screen.getByText("phone-1.jpg")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("radio", { name: /Zwrot/ })).toHaveFocus());
  });

  it("retries only the failed analysis step after a 502 and goes back to the form with the photo", async () => {
    const calls = installRouter({
      ...OK_FLOW,
      analysis: ["api-analysis-502.json", "api-analysis-200-auto.json"],
    });
    const user = setup();
    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert", undefined, { timeout: 5000 });
    expect(alert).toHaveTextContent(pl.processing.error);
    expect(callsTo(calls, "/analysis")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: pl.processing.retry }));
    await screen.findByLabelText(pl.chat.assistantMessage, undefined, { timeout: 5000 });
    expect(callsTo(calls, "/analysis")).toHaveLength(2);
    expect(callsTo(calls, "/decision")).toHaveLength(1);
    expect(calls.filter((c) => new URL(c.url, "http://localhost").pathname === "/api/cases")).toHaveLength(1);
  });

  it("keeps the filled form and the photo on 'Wróć do formularza' from the error", async () => {
    installRouter({ ...OK_FLOW, analysis: ["api-analysis-502.json"] });
    const user = setup();
    await fillAndSubmit(user);
    await screen.findByRole("alert", undefined, { timeout: 5000 });

    await user.click(screen.getByRole("button", { name: pl.processing.backToForm }));
    expect(await screen.findByLabelText(pl.form.productNameLabel)).toHaveValue("Galaxy S24");
    expect(screen.getByRole("radio", { name: /Zwrot/ })).toBeChecked();
    expect(screen.getByText("phone-1.jpg")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "phone-1.jpg" })).toBeInTheDocument();
  });

  it("treats a 409 on /decision as the processing error (A6)", async () => {
    installRouter({ ...OK_FLOW, decision: ["api-decision-409.json"] });
    const user = setup();
    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert", undefined, { timeout: 5000 });
    expect(alert).toHaveTextContent(pl.processing.error);
    expect(screen.queryByText(pl.chat.expired)).not.toBeInTheDocument();
  });

  it("shows the expired notice on a 404 and 'Nowe zgłoszenie' leads to an empty form", async () => {
    installRouter({ ...OK_FLOW, analysis: ["api-analysis-404.json"] });
    const user = setup();
    await fillAndSubmit(user);

    expect(await screen.findByText(pl.chat.expired, undefined, { timeout: 5000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: pl.chat.expiredAction }));

    expect(await screen.findByRole("button", { name: pl.form.submit })).toBeInTheDocument();
    screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeChecked());
    expect(screen.getByLabelText(pl.form.productNameLabel)).toHaveValue("");
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("reaches the chat in React.StrictMode without an error alert", async () => {
    installRouter(OK_FLOW);
    const user = setup(true);
    await fillAndSubmit(user);

    await screen.findByLabelText(pl.chat.assistantMessage, undefined, { timeout: 5000 });
    expect(screen.queryByText(pl.processing.error)).not.toBeInTheDocument();
  });

  async function reachChat(user: User): Promise<void> {
    await fillAndSubmit(user);
    await screen.findByLabelText(pl.chat.assistantMessage, undefined, { timeout: 5000 });
  }

  it("sends exactly { message, trigger } to the chat endpoint and renders the streamed reply", async () => {
    const calls = installRouter({ ...OK_FLOW, chat: ["api-chat-200-answer.json"] });
    const user = setup();
    await reachChat(user);

    await user.type(screen.getByRole("textbox", { name: pl.chat.inputLabel }), "Jaka była data zakupu?");
    await user.click(screen.getByRole("button", { name: pl.chat.send }));

    await waitFor(() => expect(screen.getAllByLabelText(pl.chat.assistantMessage)).toHaveLength(2), {
      timeout: 5000,
    });
    expect(screen.getAllByLabelText(pl.chat.assistantMessage)[1]).toHaveTextContent("Data zakupu to 23.11.2026.");
    const [chatCall] = callsTo(calls, "/chat");
    if (chatCall === undefined) throw new Error("no chat request recorded");
    expect(new URL(chatCall.url, "http://localhost").pathname).toBe(`/api/cases/${CASE_ID}/chat`);
    expect(chatCall.method).toBe("POST");
    const body = chatCall.body;
    if (typeof body !== "object" || body === null) throw new Error("chat body is not JSON");
    expect(Object.keys(body).sort()).toEqual(["message", "trigger"]);
    expect(body).toMatchObject({
      trigger: "submit-message",
      message: { role: "user", parts: [{ type: "text", text: "Jaka była data zakupu?" }] },
    });
  });

  // T45 could not capture a chat stream with a data-decision chunk (README-api.md: updateDecision never fired
  // in 2 attempts), and fabricating one is forbidden (TR5).
  it.todo("updates the summary badge from the data-decision chunk of a captured chat stream");

  it("'Nowe zgłoszenie' in the chat, once confirmed, returns to an empty form", async () => {
    installRouter(OK_FLOW);
    const user = setup();
    await reachChat(user);

    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    await user.click(await screen.findByRole("button", { name: pl.chat.newCaseDialog.confirm }));

    expect(await screen.findByRole("button", { name: pl.form.submit })).toBeInTheDocument();
    screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeChecked());
    expect(screen.queryByLabelText(pl.chat.assistantMessage)).not.toBeInTheDocument();
  });
});
