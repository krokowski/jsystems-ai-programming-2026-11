"use client";

import { useEffect, useRef } from "react";
import { CircleCheck, Circle, TriangleAlert } from "lucide-react";
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
    return <CircleCheck aria-hidden="true" className="size-5 text-primary" />;
  }
  if (status === "pending") {
    return <Circle aria-hidden="true" className="size-5 text-muted-foreground" />;
  }
  if (failed) {
    return <TriangleAlert aria-hidden="true" className="size-5 text-destructive" />;
  }
  return <Spinner aria-hidden="true" className="size-5 text-primary" />;
}

export function ProcessingScreen({ step, failed, onRetry, onBack }: ProcessingScreenProps) {
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (failed) {
      retryRef.current?.focus();
    }
  }, [failed]);

  return (
    <div className="flex min-h-[60svh] w-full items-center justify-center px-4 py-8">
      <Card className="w-full max-w-[480px]">
        <div className="px-4" aria-live="polite">
          <ol className="flex flex-col gap-4">
            {STEPS.map((key) => {
              const status = stepStatus(key, step);
              return (
                <li
                  key={key}
                  aria-current={status === "current" ? "step" : undefined}
                  className={`flex items-center gap-3 text-base ${
                    status === "pending" ? "text-muted-foreground" : "text-foreground"
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
          <div className="px-4">
            <Alert variant="destructive">
              <AlertDescription className="text-destructive">
                {pl.processing.error}
              </AlertDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button ref={retryRef} type="button" onClick={onRetry}>
                  {pl.processing.retry}
                </Button>
                <Button type="button" variant="outline" onClick={onBack}>
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
