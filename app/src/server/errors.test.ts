import { describe, expect, it, vi } from "vitest";

import { pl } from "@/lib/i18n-pl";

import {
  AiOutputError,
  AiTimeoutError,
  AiUnavailableError,
  ApiError,
  caseState,
  errorResponse,
  notFound,
  payloadTooLarge,
  toApiError,
  validationFailed,
} from "./errors";

const NOT_FOUND_MESSAGE = "Nie znaleziono zgłoszenia. Rozpocznij nowe zgłoszenie.";

describe("toApiError mapping", () => {
  it("returns an ApiError unchanged", () => {
    const original = notFound();
    expect(toApiError(original)).toBe(original);
  });

  it("maps AiTimeoutError to 504 AI_TIMEOUT with the processing message", () => {
    const mapped = toApiError(new AiTimeoutError("model timed out"));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped.status).toBe(504);
    expect(mapped.code).toBe("AI_TIMEOUT");
    expect(mapped.userMessage).toBe(pl.processing.error);
  });

  it("maps AiUnavailableError to 502 AI_UNAVAILABLE with the processing message", () => {
    const mapped = toApiError(new AiUnavailableError("upstream down"));
    expect(mapped.status).toBe(502);
    expect(mapped.code).toBe("AI_UNAVAILABLE");
    expect(mapped.userMessage).toBe(pl.processing.error);
  });

  it("maps AiOutputError to 502 AI_UNAVAILABLE with the processing message", () => {
    const mapped = toApiError(new AiOutputError("invalid JSON from model"));
    expect(mapped.status).toBe(502);
    expect(mapped.code).toBe("AI_UNAVAILABLE");
    expect(mapped.userMessage).toBe(pl.processing.error);
  });

  it("maps an unknown error to 500 INTERNAL with the Polish internal error message and logs it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mapped = toApiError(new TypeError("x"));
    expect(mapped.status).toBe(500);
    expect(mapped.code).toBe("INTERNAL");
    expect(mapped.userMessage).toBe(pl.common.internalError);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("maps non-Error values to 500 INTERNAL", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mapped = toApiError("boom");
    expect(mapped.status).toBe(500);
    expect(mapped.code).toBe("INTERNAL");
    spy.mockRestore();
  });
});

describe("error factories", () => {
  it("notFound is 404 CASE_NOT_FOUND", () => {
    const err = notFound();
    expect([err.status, err.code, err.userMessage]).toEqual([404, "CASE_NOT_FOUND", NOT_FOUND_MESSAGE]);
  });

  it("caseState is 409 CASE_STATE with the chat busy message", () => {
    const err = caseState();
    expect([err.status, err.code, err.userMessage]).toEqual([409, "CASE_STATE", pl.chat.busy]);
  });

  it("validationFailed is 422 VALIDATION_FAILED and passes fields through", () => {
    const fields = { purchaseDate: pl.form.errors.purchaseDateFuture };
    const err = validationFailed(fields);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.userMessage).toBe("Popraw zaznaczone pola formularza.");
    expect(err.fields).toEqual(fields);
  });

  it("payloadTooLarge is 413 PAYLOAD_TOO_LARGE with the photo field message", () => {
    const err = payloadTooLarge();
    expect(err.status).toBe(413);
    expect(err.code).toBe("PAYLOAD_TOO_LARGE");
    expect(err.userMessage).toBe(pl.form.errors.photoTooLarge);
    expect(err.fields).toEqual({ photo: pl.form.errors.photoTooLarge });
  });
});

describe("errorResponse", () => {
  it("returns a JSON response with the status and the error body", async () => {
    const res = errorResponse(notFound());
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({
      error: { code: "CASE_NOT_FOUND", message: NOT_FOUND_MESSAGE },
    });
  });

  it("includes fields for a 422 response", async () => {
    const res = errorResponse(validationFailed({ photo: pl.form.errors.photoFormat }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Popraw zaznaczone pola formularza.",
        fields: { photo: pl.form.errors.photoFormat },
      },
    });
  });

  it("never leaks upstream details of an AI error", async () => {
    const res = errorResponse(
      new AiUnavailableError("OpenRouter 503 upstream", { cause: new Error("stack…") }),
    );
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("OpenRouter");
    expect(text).not.toContain("503");
    expect(text).not.toContain("stack");
    expect(text).not.toContain("Error");
    expect(JSON.parse(text)).toEqual({
      error: { code: "AI_UNAVAILABLE", message: pl.processing.error },
    });
  });

  it("returns a generic 500 body for an unknown error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = errorResponse(new TypeError("secret internal detail"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("secret internal detail");
    expect(JSON.parse(text)).toEqual({
      error: { code: "INTERNAL", message: pl.common.internalError },
    });
    spy.mockRestore();
  });
});
