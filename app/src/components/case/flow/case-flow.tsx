"use client";

import { use, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { io } from "next/cache";
import { ChatScreen } from "@/components/case/chat/chat-screen";
import { CaseFormScreen } from "@/components/case/form/case-form-screen";
import { ProcessingScreen } from "@/components/case/processing/processing-screen";
import { pl } from "@/lib/i18n-pl";
import type { CaseForm, Decision } from "@/lib/schemas";
import { todayInAppZone } from "@/lib/time";
import { buildCaseFormData, createCase, runAnalysis, runDecision } from "./api-client";
import { ExpiredNotice } from "./expired-notice";
import { flowReducer } from "./reducer";
import { initialFlowState, type FormDraft, type PhotoDraft, type ProcessingStep } from "./types";

// DOM ids of the form controls in field order (owned by CaseFormScreen); used to focus the first server-rejected field.
const FIELD_FOCUS_IDS = [
  ["caseType", "case-type-return"],
  ["category", "category"],
  ["productName", "product-name"],
  ["purchaseDate", "purchase-date"],
  ["reason", "reason"],
  ["photo", "photo-button"],
] as const;

export function CaseFlow(): React.JSX.Element {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  // "Today" must be the visitor's date, not the build date: io() keeps this read out of
  // the Cache Components prerender (page.tsx wraps CaseFlow in <Suspense>).
  use(io());
  const [today] = useState(() => todayInAppZone(new Date()));

  const processingCaseId = state.kind === "processing" ? state.caseId : null;
  const processingStep: ProcessingStep | null = state.kind === "processing" ? state.step : null;
  const processingFailed = state.kind === "processing" ? state.failed : false;

  const serverErrors = state.kind === "form" ? state.serverErrors : null;
  useEffect(() => {
    if (!serverErrors) return;
    const first = FIELD_FOCUS_IDS.find(([field]) => serverErrors[field] !== undefined);
    if (first) document.getElementById(first[1])?.focus();
  }, [serverErrors]);

  // Runs the current processing step; cleanup aborts it (unmount, retry, back, StrictMode remount).
  useEffect(() => {
    if (processingCaseId === null || processingStep === null || processingFailed) return;
    const controller = new AbortController();
    const run = async (): Promise<void> => {
      if (processingStep === "analysis") {
        const result = await runAnalysis(processingCaseId, controller.signal);
        if (controller.signal.aborted || result.kind === "aborted") return;
        if (result.kind === "ok") dispatch({ type: "ANALYSIS_SUCCEEDED" });
        else dispatch({ type: result.kind === "expired" ? "EXPIRED" : "STEP_FAILED" });
        return;
      }
      const result = await runDecision(processingCaseId, controller.signal);
      if (controller.signal.aborted || result.kind === "aborted") return;
      if (result.kind === "ok") {
        dispatch({ type: "DECISION_SUCCEEDED", ...result.data });
      } else {
        dispatch({ type: result.kind === "expired" ? "EXPIRED" : "STEP_FAILED" });
      }
    };
    void run();
    return () => controller.abort();
  }, [processingCaseId, processingStep, processingFailed]);

  const photoUrl = state.kind === "form" ? (state.photo?.objectUrl ?? null) : state.kind === "expired" ? null : state.photo.objectUrl;

  // The object URL outlives form/processing/chat/expired; it is revoked on NEW_CASE only.
  const liveUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (photoUrl) liveUrlRef.current = photoUrl;
  }, [photoUrl]);

  const startNewCase = useCallback((): void => {
    if (liveUrlRef.current) URL.revokeObjectURL(liveUrlRef.current);
    liveUrlRef.current = null;
    dispatch({ type: "NEW_CASE" });
  }, []);

  const onDecisionUpdate = useCallback((decision: Decision, decisionLabel: string): void => {
    dispatch({ type: "DECISION_UPDATED", decision, decisionLabel });
  }, []);
  const onExpired = useCallback((): void => dispatch({ type: "EXPIRED" }), []);

  async function submit(values: CaseForm, photo: PhotoDraft, draft: FormDraft): Promise<void> {
    dispatch({ type: "SUBMIT_STARTED", draft, photo });
    const result = await createCase(buildCaseFormData(values, photo.file), pl.form.errors.photoTooLarge);
    if (result.kind === "created") {
      dispatch({ type: "SUBMIT_SUCCEEDED", caseId: result.data.caseId, summary: result.data.summary });
    } else if (result.kind === "rejected") {
      dispatch({ type: "SUBMIT_REJECTED", fields: result.fields });
    } else {
      dispatch({ type: "SUBMIT_FAILED", message: pl.common.internalError });
    }
  }

  return (
    <>
      {state.kind === "form" ? (
        <CaseFormScreen
          initialDraft={state.draft}
          initialPhoto={state.photo}
          serverErrors={state.serverErrors}
          formError={state.formError}
          submitting={state.submitting}
          today={today}
          onSubmit={(values, photo, draft) => {
            void submit(values, photo, draft);
          }}
        />
      ) : null}
      {state.kind === "processing" ? (
        <ProcessingScreen
          step={state.step}
          failed={state.failed}
          onRetry={() => dispatch({ type: "RETRY" })}
          onBack={() => dispatch({ type: "BACK_TO_FORM" })}
        />
      ) : null}
      {state.kind === "chat" ? (
        <ChatScreen
          key={state.caseId}
          caseId={state.caseId}
          summary={state.summary}
          firstMessage={state.firstMessage}
          photoUrl={state.photo.objectUrl}
          onDecisionUpdate={onDecisionUpdate}
          onNewCase={startNewCase}
          onExpired={onExpired}
        />
      ) : null}
      {state.kind === "expired" ? <ExpiredNotice onNewCase={startNewCase} /> : null}
    </>
  );
}
