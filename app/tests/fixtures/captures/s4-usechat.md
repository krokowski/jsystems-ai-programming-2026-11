# S4 capture: useChat seeding, request body, regenerate(), PromptInput keys

- Date: 2026-11-26
- Versions (`app/package.json`): `ai` ^7.0.181, `@ai-sdk/react` ^4.0.186, Next.js 16.4.6, dev server on port 3001, Chromium via `@playwright/test`.
- Setup: `useChat({ id: "spike", messages: [seeded assistant "Wiadomość startowa"], transport: new DefaultChatTransport({ api, prepareSendMessagesRequest: ({ messages, trigger }) => ({ body: { message: messages[messages.length - 1], trigger } }) }) })`; AI Elements `PromptInput` + `PromptInputTextarea` + `PromptInputSubmit status={status}`; server returned a fixed text stream (no model call), and 500 `{"error":{"code":"AI_UNAVAILABLE","message":"x"}}` the first time a body contained `FAIL`.

## Request bodies received (verbatim, in order)

1. `Pierwsza` (Enter):
`{"message":{"parts":[{"type":"text","text":"Pierwsza"}],"id":"PcYZug8XL7Erj8dX","role":"user"},"trigger":"submit-message"}`
2. `Linia 1` Shift+Enter `Linia 2` Enter:
`{"message":{"parts":[{"type":"text","text":"Linia 1\nLinia 2"}],"id":"m0kpWrRiJ5RVpJu2","role":"user"},"trigger":"submit-message"}`
3. Enter on empty textarea:
`{"message":{"parts":[{"type":"text","text":""}],"id":"a8I12uG9Euabg0fw","role":"user"},"trigger":"submit-message"}`
4. Enter on whitespace-only (`   `):
`{"message":{"parts":[{"type":"text","text":"   "}],"id":"O8UqLcvKCiMYZkPk","role":"user"},"trigger":"submit-message"}`
5. `FAIL` (server answered 500):
`{"message":{"parts":[{"type":"text","text":"FAIL"}],"id":"suMKricRyQ2BgPP2","role":"user"},"trigger":"submit-message"}`
6. Click Ponów (`regenerate()`):
`{"message":{"parts":[{"type":"text","text":"FAIL"}],"id":"suMKricRyQ2BgPP2","role":"user"},"trigger":"regenerate-message"}`

## Observations

- The seeded assistant message is rendered but never sent: body is exactly `{ message, trigger }` (message = last item of `messages`).
- Trigger values in the installed version are `"submit-message"` and `"regenerate-message"` (Context7 docs show other names, `submit-user-message` / `regenerate-assistant-message`; the installed behaviour is authoritative and matches the brief).
- Shift+Enter inserts a newline (`"Linia 1\n"` in the textarea, no request); Enter submits; the text contains `\n`.
- Empty and whitespace-only Enter DO submit. AI Elements `PromptInput.handleSubmit` has no trim guard and calls `onSubmit({ text: "" })`; the textarea Enter handler only skips when the submit button is `disabled`. Without a guard, an empty user message is added to the list and sent to the server.
- 500 response: `status === "error"`, `error.message` is the raw response body text (`{"error":{"code":"AI_UNAVAILABLE","message":"x"}}`), so the client must JSON-parse it (zod) to get the code. The user message `FAIL` stays in the list; no assistant message is added. When the route did not exist (dev 404 page), `error.message` was the full HTML document.
- `regenerate()` when the last message is the user message (after error): sends that user message again with `trigger: "regenerate-message"`, no `messageId` (we did not pass one). The user message stays once (same id); the assistant reply is appended after it. Status returns to `ready`, `error` is cleared.
- Sending while a previous response was `submitted`/`streaming` was possible (the button is `type=submit` unless `onStop` is passed, and Enter is not blocked), which produced interleaved duplicate replies in the spike. A client guard is needed.

## Findings for T53 (ChatScreen)

- `PromptInput.onSubmit` must guard: `const text = m.text.trim(); if (!text || status !== "ready") return;` and the submit button should be `disabled` while `status` is `submitted`/`streaming` (the textarea Enter handler respects a disabled submit button), or use `onStop={stop}`.
- `prepareSendMessagesRequest` returns `{ body: { message: messages.at(-1), trigger } }`; the server must handle both `submit-message` and `regenerate-message`. For regenerate the last user message is in `message` again, so the server must not append a duplicate if it is already persisted.
- Seeding via `useChat({ messages })` works and is not sent to the server; the server rebuilds history itself.
- Error handling: parse `error.message` as JSON (`{ error: { code, message } }`) with zod; fall back to a generic Polish message when it is not JSON (HTML error page, network failure).
- "Ponów" button: show when `status === "error"`, call `regenerate()`; it does not create an extra user message.
- Shift+Enter newline and Enter submit work out of the box with `PromptInputTextarea`; render user text with `whitespace-pre-wrap`.
- `PromptInputTextarea` default placeholder is English; pass a Polish one from `i18n-pl`. `PromptInputSubmit` has English `aria-label` ("Submit"/"Stop"); override via props.
