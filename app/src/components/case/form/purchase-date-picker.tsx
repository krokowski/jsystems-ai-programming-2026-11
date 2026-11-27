"use client";

import { format, parse } from "date-fns";
import { pl as plLocale } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DayButton } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pl } from "@/lib/i18n-pl";
import { MIN_PURCHASE_DATE } from "@/lib/schemas";
import { formatDatePl } from "@/lib/time";
import { FieldError } from "./field-error";

interface Props {
  value: string;
  onChange: (iso: string) => void;
  today: string;
  error: string | undefined;
}

const ISO = "yyyy-MM-dd";
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIso(iso: string): Date {
  return parse(iso, ISO, new Date(0));
}

function IsoDayButton(props: React.ComponentProps<typeof DayButton>): React.JSX.Element {
  return <CalendarDayButton {...props} locale={plLocale} data-iso={format(props.day.date, ISO)} />;
}

export function PurchaseDatePicker({ value, onChange, today, error }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const errorId = "purchase-date-error";
  const todayDate = parseIso(today);
  const selected = ISO_RE.test(value) ? parseIso(value) : undefined;
  const minDate = parseIso(MIN_PURCHASE_DATE);

  return (
    <div className="flex flex-col gap-2.5">
      <Label id="purchase-date-label" className="text-[15px] font-bold">{pl.form.purchaseDateLabel}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id="purchase-date"
              type="button"
              variant="outline"
              aria-labelledby="purchase-date-label purchase-date"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="h-12 w-full justify-start gap-2 rounded-[10px] border-input bg-card px-3.5 text-base font-normal hover:bg-muted"
            />
          }
        >
          <CalendarIcon aria-hidden="true" className="text-primary" />
          <span className={value ? undefined : "text-muted-foreground"}>
            {value ? formatDatePl(value) : pl.form.purchaseDatePlaceholder}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={plLocale}
            weekStartsOn={1}
            today={todayDate}
            selected={selected}
            defaultMonth={selected ?? todayDate}
            startMonth={new Date(minDate.getFullYear(), minDate.getMonth(), 1)}
            endMonth={new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)}
            disabled={[{ after: todayDate }, { before: minDate }]}
            labels={{
              labelPrevious: () => pl.form.previousMonth,
              labelNext: () => pl.form.nextMonth,
            }}
            components={{ DayButton: IsoDayButton }}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, ISO));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
