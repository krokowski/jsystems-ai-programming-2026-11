"use client";

import { Radio } from "@base-ui/react/radio";
import { cn } from "cn";
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
      <legend id="case-type-legend" className="mb-2 text-sm font-medium">
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
        className="grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {CASE_TYPES.map((type) => (
          <Radio.Root
            key={type}
            id={`case-type-${type}`}
            value={type}
            aria-labelledby={`case-type-${type}-title`}
            aria-describedby={`case-type-${type}-desc`}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col gap-1 border border-input bg-transparent p-4 text-left outline-none transition-colors",
              "hover:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "data-checked:border-primary data-checked:bg-primary/10",
              error && "border-destructive",
            )}
          >
            <span id={`case-type-${type}-title`} className="text-base font-medium">
              {pl.form.caseTypeLabels[type]}
            </span>
            <span id={`case-type-${type}-desc`} className="text-sm text-muted-foreground">
              {pl.form.caseTypeDescriptions[type]}
            </span>
          </Radio.Root>
        ))}
      </RadioGroup>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
