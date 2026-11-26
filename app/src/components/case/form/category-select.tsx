"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pl } from "@/lib/i18n-pl";
import { CATEGORIES, type Category } from "@/lib/schemas";
import { FieldError } from "./field-error";

interface Props {
  value: Category | "";
  onChange: (value: Category) => void;
  error: string | undefined;
}

function isCategory(v: unknown): v is Category {
  return CATEGORIES.some((c) => c === v);
}

const items = CATEGORIES.map((value) => ({ value, label: pl.form.categoryLabels[value] }));

export function CategorySelect({ value, onChange, error }: Props): React.JSX.Element {
  const errorId = "category-error";
  return (
    <div className="flex flex-col gap-2">
      <Label id="category-label">{pl.form.categoryLabel}</Label>
      <Select
        items={items}
        value={value === "" ? null : value}
        onValueChange={(v) => {
          if (isCategory(v)) onChange(v);
        }}
      >
        <SelectTrigger
          id="category"
          aria-labelledby="category-label"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11 w-full"
        >
          <SelectValue placeholder={pl.form.categoryPlaceholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className="min-h-11">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
