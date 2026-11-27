import { validateUIMessages } from "ai";
import {
  analysisResponseSchema,
  apiErrorBodySchema,
  createCaseResponseSchema,
  dataPartSchemas,
  decisionResponseSchema,
  messageMetadataSchema,
  type AppUIMessage,
  type CaseForm,
  type CreateCaseResponse,
  type Decision,
  type FieldErrors,
} from "@/lib/schemas";

/** Client backstop for one processing request; the server answers within 58 s (ADR-004 §3.3). */
export const STEP_TIMEOUT_MS = 62_000;

const FIELD_KEYS = ["caseType", "category", "productName", "purchaseDate", "reason", "photo"] as const;

export type CreateCaseResult =
  | { kind: "created"; data: CreateCaseResponse }
  | { kind: "rejected"; fields: FieldErrors }
  | { kind: "failed" };

export type StepResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "expired" } // 404
  | { kind: "failed" } // 502 / 504 / 409 / timeout / network / malformed body
  | { kind: "aborted" }; // the caller cancelled the request

export interface DecisionStepData {
  firstMessage: AppUIMessage;
  decision: Decision;
  decisionLabel: string;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const parsed: unknown = await response.json();
    return parsed;
  } catch {
    return null;
  }
}

function knownFields(fields: Record<string, string> | undefined): FieldErrors {
  const out: FieldErrors = {};
  for (const key of FIELD_KEYS) {
    const message = fields?.[key];
    if (message !== undefined) out[key] = message;
  }
  return out;
}

export function buildCaseFormData(values: CaseForm, photo: File): FormData {
  const data = new FormData();
  data.append("caseType", values.caseType);
  data.append("category", values.category);
  data.append("productName", values.productName);
  data.append("purchaseDate", values.purchaseDate);
  data.append("reason", values.reason ?? "");
  data.append("photo", photo);
  return data;
}

export async function createCase(body: FormData, photoTooLargeMessage: string): Promise<CreateCaseResult> {
  let response: Response;
  try {
    response = await fetch("/api/cases", { method: "POST", body });
  } catch {
    return { kind: "failed" };
  }
  const json = await readJson(response);
  if (response.status === 201) {
    const parsed = createCaseResponseSchema.safeParse(json);
    return parsed.success ? { kind: "created", data: parsed.data } : { kind: "failed" };
  }
  if (response.status === 422 || response.status === 413) {
    const parsed = apiErrorBodySchema.safeParse(json);
    const fields = parsed.success ? knownFields(parsed.data.error.fields) : {};
    if (Object.keys(fields).length > 0) return { kind: "rejected", fields };
    if (response.status === 413) return { kind: "rejected", fields: { photo: photoTooLargeMessage } };
  }
  return { kind: "failed" };
}

async function post(path: string, signal: AbortSignal): Promise<Response | "expired" | "failed" | "aborted"> {
  try {
    const response = await fetch(path, {
      method: "POST",
      signal: AbortSignal.any([signal, AbortSignal.timeout(STEP_TIMEOUT_MS)]),
    });
    if (response.status === 404) return "expired";
    return response;
  } catch {
    // Only the caller's own abort is ignored; a backstop timeout is a failed step.
    return signal.aborted ? "aborted" : "failed";
  }
}

export async function runAnalysis(caseId: string, signal: AbortSignal): Promise<StepResult<null>> {
  const response = await post(`/api/cases/${caseId}/analysis`, signal);
  if (typeof response === "string") return response === "expired" ? { kind: "expired" } : { kind: response };
  if (response.status !== 200) return { kind: "failed" };
  const parsed = analysisResponseSchema.safeParse(await readJson(response));
  return parsed.success ? { kind: "ok", data: null } : { kind: "failed" };
}

export async function runDecision(caseId: string, signal: AbortSignal): Promise<StepResult<DecisionStepData>> {
  const response = await post(`/api/cases/${caseId}/decision`, signal);
  if (typeof response === "string") return response === "expired" ? { kind: "expired" } : { kind: response };
  if (response.status !== 200) return { kind: "failed" };
  const parsed = decisionResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) return { kind: "failed" };
  try {
    const [firstMessage] = await validateUIMessages<AppUIMessage>({
      messages: [parsed.data.firstMessage],
      metadataSchema: messageMetadataSchema,
      dataSchemas: dataPartSchemas,
    });
    if (firstMessage === undefined) return { kind: "failed" };
    return {
      kind: "ok",
      data: { firstMessage, decision: parsed.data.decision, decisionLabel: parsed.data.decisionLabel },
    };
  } catch {
    return { kind: "failed" };
  }
}
