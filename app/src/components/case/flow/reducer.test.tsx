import { describe, expect, it } from "vitest";
import type { AppUIMessage, CaseSummary, FieldErrors } from "@/lib/schemas";
import { flowReducer } from "./reducer";
import {
  EMPTY_DRAFT,
  initialFlowState,
  type FlowState,
  type FormDraft,
  type PhotoDraft,
} from "./types";

const file = new File(["x"], "phone-1.jpg", { type: "image/jpeg" });
const photo: PhotoDraft = { file, objectUrl: "blob:test" };

const draft: FormDraft = {
  caseType: "complaint",
  category: "smartphone",
  productName: "Galaxy S24",
  purchaseDate: "2026-10-01",
  reason: "Pęknięty ekran po upadku",
};

const caseId = "3f2b8c1e-6a4d-4b7e-9c1f-2a5d8e7b6c40";

const summary: CaseSummary = {
  caseType: "complaint",
  category: "smartphone",
  productName: "Galaxy S24",
  purchaseDate: "2026-10-01",
  thumbnailDataUrl: "data:image/jpeg;base64,AAAA",
  decision: null,
  decisionLabel: null,
};

const firstMessage: AppUIMessage = {
  id: "msg-1",
  role: "assistant",
  parts: [{ type: "text", text: "Dzień dobry, analiza zakończona." }],
};

const serverErrors: FieldErrors = { productName: "Nieprawidłowa nazwa" };

const emptyForm: FlowState = {
  kind: "form",
  draft: EMPTY_DRAFT,
  photo: null,
  serverErrors: {},
  formError: null,
  submitting: false,
};

const submittingForm: FlowState = {
  kind: "form",
  draft,
  photo,
  serverErrors: {},
  formError: null,
  submitting: true,
};

const analysisProcessing: FlowState = {
  kind: "processing",
  caseId,
  summary,
  step: "analysis",
  failed: false,
  draft,
  photo,
};

const decisionProcessing: FlowState = {
  kind: "processing",
  caseId,
  summary,
  step: "decision",
  failed: false,
  draft,
  photo,
};

const chat: FlowState = {
  kind: "chat",
  caseId,
  summary: { ...summary, decision: "approve", decisionLabel: "Zwrot zatwierdzony" },
  firstMessage,
  draft,
  photo,
};

const expired: FlowState = { kind: "expired" };

describe("flowReducer: initial state", () => {
  it("starts as an empty form with no photo and not submitting", () => {
    expect(initialFlowState).toEqual(emptyForm);
  });
});

describe("flowReducer: form", () => {
  it("SUBMIT_STARTED stores draft and photo, sets submitting and clears previous errors", () => {
    const withErrors: FlowState = {
      kind: "form",
      draft: EMPTY_DRAFT,
      photo: null,
      serverErrors,
      formError: "Coś poszło nie tak",
      submitting: false,
    };

    const next = flowReducer(withErrors, { type: "SUBMIT_STARTED", draft, photo });

    expect(next).toEqual({
      kind: "form",
      draft,
      photo,
      serverErrors: {},
      formError: null,
      submitting: true,
    });
  });

  it("SUBMIT_SUCCEEDED moves to processing at the analysis step, keeping draft and photo", () => {
    const next = flowReducer(submittingForm, { type: "SUBMIT_SUCCEEDED", caseId, summary });

    expect(next).toEqual({
      kind: "processing",
      caseId,
      summary,
      step: "analysis",
      failed: false,
      draft,
      photo,
    });
  });

  it("SUBMIT_SUCCEEDED is ignored when no submit is in progress", () => {
    const state = emptyForm;
    expect(flowReducer(state, { type: "SUBMIT_SUCCEEDED", caseId, summary })).toBe(state);
  });

  it("SUBMIT_REJECTED returns to the form with field errors and keeps the values", () => {
    const next = flowReducer(submittingForm, { type: "SUBMIT_REJECTED", fields: serverErrors });

    expect(next).toEqual({
      kind: "form",
      draft,
      photo,
      serverErrors,
      formError: null,
      submitting: false,
    });
  });

  it("SUBMIT_FAILED returns to the form with a form-level error and keeps the values", () => {
    const next = flowReducer(submittingForm, { type: "SUBMIT_FAILED", message: "Błąd serwera" });

    expect(next).toEqual({
      kind: "form",
      draft,
      photo,
      serverErrors: {},
      formError: "Błąd serwera",
      submitting: false,
    });
  });

  it("ignores SUBMIT_STARTED outside the form", () => {
    expect(flowReducer(analysisProcessing, { type: "SUBMIT_STARTED", draft, photo })).toBe(
      analysisProcessing,
    );
  });
});

describe("flowReducer: processing", () => {
  it("ANALYSIS_SUCCEEDED moves from analysis to decision", () => {
    expect(flowReducer(analysisProcessing, { type: "ANALYSIS_SUCCEEDED" })).toEqual({
      ...analysisProcessing,
      step: "decision",
      failed: false,
    });
  });

  it("ANALYSIS_SUCCEEDED is ignored on the decision step", () => {
    expect(flowReducer(decisionProcessing, { type: "ANALYSIS_SUCCEEDED" })).toBe(decisionProcessing);
  });

  it("DECISION_SUCCEEDED moves to chat with decision and label on the summary", () => {
    const next = flowReducer(decisionProcessing, {
      type: "DECISION_SUCCEEDED",
      firstMessage,
      decision: "approve",
      decisionLabel: "Zwrot zatwierdzony",
    });

    expect(next).toEqual({
      kind: "chat",
      caseId,
      summary: { ...summary, decision: "approve", decisionLabel: "Zwrot zatwierdzony" },
      firstMessage,
      draft,
      photo,
    });
  });

  it("DECISION_SUCCEEDED is ignored on the analysis step", () => {
    expect(
      flowReducer(analysisProcessing, {
        type: "DECISION_SUCCEEDED",
        firstMessage,
        decision: "reject",
        decisionLabel: "Odrzucone",
      }),
    ).toBe(analysisProcessing);
  });

  it("STEP_FAILED marks the current step as failed without changing the step", () => {
    expect(flowReducer(analysisProcessing, { type: "STEP_FAILED" })).toEqual({
      ...analysisProcessing,
      failed: true,
    });
    expect(flowReducer(decisionProcessing, { type: "STEP_FAILED" })).toEqual({
      ...decisionProcessing,
      failed: true,
    });
  });

  it("RETRY on a failed analysis step clears the failure and stays on analysis", () => {
    const failed = flowReducer(analysisProcessing, { type: "STEP_FAILED" });
    const next = flowReducer(failed, { type: "RETRY" });

    expect(next).toEqual(analysisProcessing);
    expect(next.kind === "processing" && next.step).toBe("analysis");
  });

  it("RETRY on a failed decision step repeats only decision and stays on decision", () => {
    const failed = flowReducer(decisionProcessing, { type: "STEP_FAILED" });
    const next = flowReducer(failed, { type: "RETRY" });

    expect(next).toEqual(decisionProcessing);
    expect(next.kind === "processing" && next.step).toBe("decision");
  });

  it("BACK_TO_FORM from a failed analysis keeps draft and photo with no errors", () => {
    const failed = flowReducer(analysisProcessing, { type: "STEP_FAILED" });
    const next = flowReducer(failed, { type: "BACK_TO_FORM" });

    expect(next).toEqual({
      kind: "form",
      draft,
      photo,
      serverErrors: {},
      formError: null,
      submitting: false,
    });
  });

  it("BACK_TO_FORM from a failed decision keeps draft and photo", () => {
    const failed = flowReducer(decisionProcessing, { type: "STEP_FAILED" });
    const next = flowReducer(failed, { type: "BACK_TO_FORM" });

    expect(next).toEqual({
      kind: "form",
      draft,
      photo,
      serverErrors: {},
      formError: null,
      submitting: false,
    });
  });

  it("a submit after BACK_TO_FORM starts a new case submission", () => {
    const back = flowReducer(decisionProcessing, { type: "BACK_TO_FORM" });
    const submitted = flowReducer(back, { type: "SUBMIT_STARTED", draft, photo });

    expect(submitted).toEqual({
      kind: "form",
      draft,
      photo,
      serverErrors: {},
      formError: null,
      submitting: true,
    });
  });
});

describe("flowReducer: chat", () => {
  it("DECISION_UPDATED changes decision and label and keeps everything else", () => {
    const next = flowReducer(chat, {
      type: "DECISION_UPDATED",
      decision: "reject",
      decisionLabel: "Reklamacja odrzucona",
    });

    expect(next).toEqual({
      ...chat,
      summary: { ...summary, decision: "reject", decisionLabel: "Reklamacja odrzucona" },
    });
  });

  it("DECISION_UPDATED is ignored outside chat", () => {
    expect(
      flowReducer(analysisProcessing, {
        type: "DECISION_UPDATED",
        decision: "reject",
        decisionLabel: "Odrzucone",
      }),
    ).toBe(analysisProcessing);
  });

  it("RETRY is ignored in chat", () => {
    expect(flowReducer(chat, { type: "RETRY" })).toBe(chat);
  });
});

describe("flowReducer: expired and new case", () => {
  it("EXPIRED from analysis, decision and chat goes to expired", () => {
    expect(flowReducer(analysisProcessing, { type: "EXPIRED" })).toEqual(expired);
    expect(flowReducer(decisionProcessing, { type: "EXPIRED" })).toEqual(expired);
    expect(flowReducer(chat, { type: "EXPIRED" })).toEqual(expired);
  });

  it("EXPIRED is ignored on the form", () => {
    expect(flowReducer(emptyForm, { type: "EXPIRED" })).toBe(emptyForm);
  });

  it("NEW_CASE from chat resets to the empty form", () => {
    expect(flowReducer(chat, { type: "NEW_CASE" })).toBe(initialFlowState);
  });

  it("NEW_CASE from expired resets to the empty form", () => {
    expect(flowReducer(expired, { type: "NEW_CASE" })).toBe(initialFlowState);
  });

  it("NEW_CASE from processing resets to the empty form", () => {
    expect(flowReducer(decisionProcessing, { type: "NEW_CASE" })).toBe(initialFlowState);
  });

  it("invalid actions on expired return the same object", () => {
    expect(flowReducer(expired, { type: "SUBMIT_STARTED", draft, photo })).toBe(expired);
    expect(flowReducer(expired, { type: "STEP_FAILED" })).toBe(expired);
  });
});

describe("flowReducer: full flow", () => {
  it("runs submit, analysis failure, retry, decision and chat update", () => {
    let state: FlowState = initialFlowState;
    state = flowReducer(state, { type: "SUBMIT_STARTED", draft, photo });
    state = flowReducer(state, { type: "SUBMIT_SUCCEEDED", caseId, summary });
    state = flowReducer(state, { type: "STEP_FAILED" });
    state = flowReducer(state, { type: "RETRY" });
    state = flowReducer(state, { type: "ANALYSIS_SUCCEEDED" });
    state = flowReducer(state, { type: "DECISION_SUCCEEDED", firstMessage, decision: "approve", decisionLabel: "Zwrot zatwierdzony" });
    state = flowReducer(state, { type: "DECISION_UPDATED", decision: "manual_review", decisionLabel: "Do weryfikacji" });
    state = flowReducer(state, { type: "NEW_CASE" });

    expect(state).toBe(initialFlowState);
  });
});
