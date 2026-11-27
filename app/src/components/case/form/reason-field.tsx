"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pl } from "@/lib/i18n-pl";
import { REASON_MAX, type CaseType } from "@/lib/schemas";
import { FieldError } from "./field-error";

interface Props {
  registration: UseFormRegisterReturn;
  caseType: CaseType | "";
  length: number;
  error: string | undefined;
}

export function ReasonField({ registration, caseType, length, error }: Props): React.JSX.Element {
  const errorId = "reason-error";
  const helperId = "reason-helper";
  const helperType: CaseType = caseType === "complaint" ? "complaint" : "return";
  return (
    <div className="flex flex-col gap-2.5">
      <Label htmlFor="reason" className="text-[15px] font-bold">
        <span>{pl.form.reasonLabel}</span>{" "}
        <span className="font-normal text-muted-foreground">
          {caseType === "complaint" ? pl.form.reasonRequired : pl.form.reasonOptional}
        </span>
      </Label>
      <p id={helperId} className="text-sm text-muted-foreground">
        {pl.form.reasonHelper[helperType]}
      </p>
      <Textarea
        id="reason"
        maxLength={REASON_MAX}
        rows={4}
        className="min-h-28 rounded-[10px] bg-card px-3.5 py-3 focus-visible:ring-ring/30"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${helperId} ${errorId}` : helperId}
        {...registration}
      />
      <div className="flex justify-between gap-2">
        <FieldError id={errorId} message={error} />
        <span className="ml-auto text-sm text-muted-foreground">{pl.form.reasonCounter(length)}</span>
      </div>
    </div>
  );
}
