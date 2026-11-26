import "server-only";

import { pl } from "@/lib/i18n-pl";

export type ApiErrorCode =
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_FAILED"
  | "INTERNAL"
  | "CASE_NOT_FOUND"
  | "CASE_STATE"
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT";

export interface AiErrorOptions {
  cause?: unknown;
}

// Customer-facing error. `userMessage` is Polish and safe to show; technical details never go here.
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly fields?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    status: number,
    userMessage: string,
    fields?: Record<string, string>,
  ) {
    super(userMessage);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
    this.fields = fields;
  }
}

// Internal AI errors. Their messages are for server logs only.
export class AiTimeoutError extends Error {
  constructor(message: string, options?: AiErrorOptions) {
    super(message, options);
    this.name = "AiTimeoutError";
  }
}

export class AiUnavailableError extends Error {
  constructor(message: string, options?: AiErrorOptions) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

export class AiOutputError extends Error {
  constructor(message: string, options?: AiErrorOptions) {
    super(message, options);
    this.name = "AiOutputError";
  }
}

export function notFound(): ApiError {
  return new ApiError(
    "CASE_NOT_FOUND",
    404,
    "Nie znaleziono zgłoszenia. Rozpocznij nowe zgłoszenie.",
  );
}

export function caseState(): ApiError {
  return new ApiError("CASE_STATE", 409, pl.chat.busy);
}

export function validationFailed(fields: Record<string, string>): ApiError {
  return new ApiError("VALIDATION_FAILED", 422, "Popraw zaznaczone pola formularza.", fields);
}

export function payloadTooLarge(): ApiError {
  const message = pl.form.errors.photoTooLarge;
  return new ApiError("PAYLOAD_TOO_LARGE", 413, message, { photo: message });
}

// Maps any thrown value to a customer-facing ApiError. Unknown errors are logged here, server-side only.
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof AiTimeoutError) {
    return new ApiError("AI_TIMEOUT", 504, pl.processing.error);
  }
  if (err instanceof AiUnavailableError || err instanceof AiOutputError) {
    return new ApiError("AI_UNAVAILABLE", 502, pl.processing.error);
  }
  console.error("Unhandled error", err);
  return new ApiError("INTERNAL", 500, pl.common.internalError);
}

export function errorResponse(err: unknown): Response {
  const apiError = toApiError(err);
  const body = {
    error: {
      code: apiError.code,
      message: apiError.userMessage,
      ...(apiError.fields ? { fields: apiError.fields } : {}),
    },
  };
  return new Response(JSON.stringify(body), {
    status: apiError.status,
    headers: { "Content-Type": "application/json" },
  });
}
