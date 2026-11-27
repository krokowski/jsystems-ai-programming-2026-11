"use client";

import { Radio } from "@base-ui/react/radio";
import { cn } from "cn";
import { Check, PackageOpen, Wrench } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio-group";
import { pl } from "@/lib/i18n-pl";
import { CASE_TYPES, type CaseType } from "@/lib/schemas";
import { FieldError } from "./field-error";

interface Props {
  value: CaseType | "";
  onChange: (value: CaseType) => void;
  error: string | undefined;
}

function isCaseType(v: unknown): v is CaseType {
  return CASE_TYPES.some((c) => c === v);
}

export function CaseTypeCards({ value, onChange, error }: Props): React.JSX.Element {
  const errorId = "case-type-error";
  return (
    <fieldset className="flex flex-col gap-2">
      <legend id="case-type-legend" className="mb-2 text-[15px] font-bold text-foreground">
        {pl.form.caseTypeLegend}
      </legend>
      <RadioGroup
        aria-labelledby="case-type-legend"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        onValueChange={(v) => {
          if (isCaseType(v)) onChange(v);
        }}
        className="grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {CASE_TYPES.map((type) => (
          <Radio.Root
            key={type}
            id={`case-type-${type}`}
            value={type}
            aria-labelledby={`case-type-${type}-title`}
            aria-describedby={`case-type-${type}-desc`}
            className={cn(
              "group/tile relative flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 border-input bg-card p-4 text-left outline-none transition-colors",
              "hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              "data-checked:border-primary data-checked:bg-secondary",
              error && "border-destructive",
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary group-data-checked/tile:bg-card"
            >
              {type === "return" ? <PackageOpen className="size-5" /> : <Wrench className="size-5" />}
            </span>
            <span className="flex min-w-0 flex-col gap-1 pr-6">
              <span id={`case-type-${type}-title`} className="text-base font-bold text-foreground">
                {pl.form.caseTypeLabels[type]}
              </span>
              <span id={`case-type-${type}-desc`} className="text-sm text-muted-foreground">
                {pl.form.caseTypeDescriptions[type]}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="absolute top-3 right-3 hidden size-5 items-center justify-center rounded-full bg-primary text-primary-foreground group-data-checked/tile:flex"
            >
              <Check className="size-3.5" />
            </span>
          </Radio.Root>
        ))}
      </RadioGroup>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
