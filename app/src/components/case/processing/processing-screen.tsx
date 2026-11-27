"use client";

import { useEffect, useRef } from "react";
import { Check, TriangleAlert } from "lucide-react";
import type { ProcessingScreenProps, ProcessingStep } from "@/components/case/flow/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { pl } from "@/lib/i18n-pl";

const STEPS: readonly ProcessingStep[] = ["analysis", "decision"];

type StepStatus = "done" | "current" | "pending";

function stepStatus(step: ProcessingStep, current: ProcessingStep): StepStatus {
  if (step === current) {
    return "current";
  }
  return STEPS.indexOf(step) < STEPS.indexOf(current) ? "done" : "pending";
}

function StepIcon({ status, failed }: { status: StepStatus; failed: boolean }) {
  if (status === "done") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-[#e7f7ef] text-[#16794a]">
        <Check aria-hidden="true" className="size-4" />
      </span>
    );
  }
  if (status === "pending") {
    return <span aria-hidden="true" className="size-8 rounded-full border-2 border-input bg-muted" />;
  }
  if (failed) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-[#fdecec] text-destructive">
        <TriangleAlert aria-hidden="true" className="size-4" />
      </span>
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-accent">
      <Spinner aria-hidden="true" className="size-5 text-brand-accent" />
    </span>
  );
}

export function ProcessingScreen({ step, failed, onRetry, onBack }: ProcessingScreenProps) {
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (failed) {
      retryRef.current?.focus();
    }
  }, [failed]);

  return (
    <div className="flex min-h-[60svh] w-full items-center justify-center px-0 py-8">
      <Card className="w-full max-w-[480px] rounded-2xl py-8 shadow-card ring-0 [--card-spacing:--spacing(6)]">
        <div className="px-8" aria-live="polite">
          <ol className="flex flex-col gap-5">
            {STEPS.map((key) => {
              const status = stepStatus(key, step);
              return (
                <li
                  key={key}
                  aria-current={status === "current" ? "step" : undefined}
                  className={`flex items-center gap-4 text-lg ${
                    status === "pending" ? "text-muted-foreground" : "font-bold text-foreground"
                  }`}
                >
                  <StepIcon status={status} failed={failed} />
                  <span>{pl.processing.steps[key]}</span>
                  {status === "done" ? <span className="sr-only">(zakończono)</span> : null}
                </li>
              );
            })}
          </ol>
        </div>

        {failed ? (
          <div className="px-8">
            <Alert variant="destructive" className="rounded-xl border-0 bg-[#fdecec] px-4 py-3">
              <AlertDescription className="text-[#b42318]">
                {pl.processing.error}
              </AlertDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button ref={retryRef} type="button" className="h-11 rounded-full px-5" onClick={onRetry}>
                  {pl.processing.retry}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={onBack}>
                  {pl.processing.backToForm}
                </Button>
              </div>
            </Alert>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
