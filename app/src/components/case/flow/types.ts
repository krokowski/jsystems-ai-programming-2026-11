import type {
  AppUIMessage,
  Category,
  CaseForm,
  CaseSummary,
  CaseType,
  Decision,
  FieldErrors,
} from "@/lib/schemas";

export interface FormDraft {
  caseType: CaseType | "";
  category: Category | "";
  productName: string;
  purchaseDate: string;
  reason: string;
}

export const EMPTY_DRAFT: FormDraft = {
  caseType: "",
  category: "",
  productName: "",
  purchaseDate: "",
  reason: "",
};

export interface PhotoDraft {
  file: File;
  objectUrl: string;
}

export type ProcessingStep = "analysis" | "decision";

export type FlowState =
  | {
      kind: "form";
      draft: FormDraft;
      photo: PhotoDraft | null;
      serverErrors: FieldErrors;
      formError: string | null;
      submitting: boolean;
    }
  | {
      kind: "processing";
      caseId: string;
      summary: CaseSummary;
      step: ProcessingStep;
      failed: boolean;
      draft: FormDraft;
      photo: PhotoDraft;
    }
  | {
      kind: "chat";
      caseId: string;
      summary: CaseSummary;
      firstMessage: AppUIMessage;
      draft: FormDraft;
      photo: PhotoDraft;
    }
  | { kind: "expired" };

export type FlowAction =
  | { type: "SUBMIT_STARTED"; draft: FormDraft; photo: PhotoDraft }
  | { type: "SUBMIT_SUCCEEDED"; caseId: string; summary: CaseSummary }
  | { type: "SUBMIT_REJECTED"; fields: FieldErrors } // 422/413
  | { type: "SUBMIT_FAILED"; message: string } // other errors → form-level alert
  | { type: "ANALYSIS_SUCCEEDED" }
  | { type: "DECISION_SUCCEEDED"; firstMessage: AppUIMessage; decision: Decision; decisionLabel: string }
  | { type: "STEP_FAILED" } // 502/504/409/timeout/network on the current step
  | { type: "RETRY" } // repeats the failed step only
  | { type: "BACK_TO_FORM" } // keeps draft + photo; next submit creates a new case
  | { type: "DECISION_UPDATED"; decision: Decision; decisionLabel: string } // from data-decision parts
  | { type: "NEW_CASE" } // confirmed dialog or expired notice → empty form
  | { type: "EXPIRED" }; // 404 from any case endpoint

export const initialFlowState: FlowState = {
  kind: "form",
  draft: EMPTY_DRAFT,
  photo: null,
  serverErrors: {},
  formError: null,
  submitting: false,
};

// Screen props (implemented by T51–T53):
export interface CaseFormScreenProps {
  initialDraft: FormDraft;
  initialPhoto: PhotoDraft | null;
  serverErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  today: string;
  onSubmit: (values: CaseForm, photo: PhotoDraft, draft: FormDraft) => void;
}

export interface ProcessingScreenProps {
  step: ProcessingStep;
  failed: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export interface ChatScreenProps {
  caseId: string;
  summary: CaseSummary;
  firstMessage: AppUIMessage;
  photoUrl: string;
  onDecisionUpdate: (decision: Decision, decisionLabel: string) => void;
  onNewCase: () => void;
  onExpired: () => void;
}
