import "server-only";

import type { CaseForm } from "@/lib/schemas/case-form";
import type { CaseType } from "@/lib/schemas/enums";
import type { ScreeningResult } from "@/lib/schemas/domain";

export interface ScreeningInput {
  caseId: string;
  caseType: CaseType;
  form: CaseForm;
  jpeg: Buffer;
  signal?: AbortSignal;
}

/** Stage 1 (ADR-002 §3.2). Implementations never throw: failures are reported in `ScreeningResult.error`. */
export interface ScreeningPort {
  screen(input: ScreeningInput): Promise<ScreeningResult>;
}
