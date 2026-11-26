import { initialFlowState, type FlowAction, type FlowState } from "./types";

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "SUBMIT_STARTED":
      if (state.kind !== "form") return state;
      return {
        kind: "form",
        draft: action.draft,
        photo: action.photo,
        serverErrors: {},
        formError: null,
        submitting: true,
      };

    case "SUBMIT_SUCCEEDED":
      if (state.kind !== "form" || !state.submitting || !state.photo) return state;
      return {
        kind: "processing",
        caseId: action.caseId,
        summary: action.summary,
        step: "analysis",
        failed: false,
        draft: state.draft,
        photo: state.photo,
      };

    case "SUBMIT_REJECTED":
      if (state.kind !== "form" || !state.submitting) return state;
      return { ...state, serverErrors: action.fields, formError: null, submitting: false };

    case "SUBMIT_FAILED":
      if (state.kind !== "form" || !state.submitting) return state;
      return { ...state, serverErrors: {}, formError: action.message, submitting: false };

    case "ANALYSIS_SUCCEEDED":
      if (state.kind !== "processing" || state.step !== "analysis") return state;
      return { ...state, step: "decision", failed: false };

    case "DECISION_SUCCEEDED":
      if (state.kind !== "processing" || state.step !== "decision") return state;
      return {
        kind: "chat",
        caseId: state.caseId,
        summary: { ...state.summary, decision: action.decision, decisionLabel: action.decisionLabel },
        firstMessage: action.firstMessage,
        draft: state.draft,
        photo: state.photo,
      };

    case "STEP_FAILED":
      if (state.kind !== "processing") return state;
      return { ...state, failed: true };

    case "RETRY":
      if (state.kind !== "processing") return state;
      return { ...state, failed: false };

    case "BACK_TO_FORM":
      if (state.kind !== "processing") return state;
      return {
        kind: "form",
        draft: state.draft,
        photo: state.photo,
        serverErrors: {},
        formError: null,
        submitting: false,
      };

    case "DECISION_UPDATED":
      if (state.kind !== "chat") return state;
      return {
        ...state,
        summary: { ...state.summary, decision: action.decision, decisionLabel: action.decisionLabel },
      };

    case "NEW_CASE":
      return initialFlowState;

    case "EXPIRED":
      if (state.kind !== "processing" && state.kind !== "chat") return state;
      return { kind: "expired" };

    default:
      return state;
  }
}
