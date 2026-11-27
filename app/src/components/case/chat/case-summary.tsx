"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CaseSummary as CaseSummaryData } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";
import { formatDatePl } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DecisionBadge } from "./decision-badge";

interface CaseSummaryProps {
  summary: CaseSummaryData;
  photoUrl: string;
}

export function CaseSummary({ summary, photoUrl }: CaseSummaryProps) {
  const [open, setOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const rows: ReadonlyArray<readonly [string, string]> = [
    [pl.chat.summary.caseType, pl.form.caseTypeLabels[summary.caseType]],
    [pl.chat.summary.category, pl.form.categoryLabels[summary.category]],
    [pl.chat.summary.product, summary.productName],
    [pl.chat.summary.purchaseDate, formatDatePl(summary.purchaseDate)],
  ];

  const details = (
    <div className="mt-3 flex gap-4">
      <Button
        type="button"
        variant="outline"
        aria-label={pl.chat.photoThumbnail}
        className="size-24 shrink-0 overflow-hidden rounded-xl p-0"
        onClick={() => setPhotoOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={summary.thumbnailDataUrl} alt="" className="size-full object-cover" />
      </Button>
      <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-[15px] font-semibold break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <section className="rounded-2xl bg-card p-4 text-sm shadow-card md:p-5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium md:hidden">{summary.productName}</span>
        <div data-testid="summary-decision" className="ml-auto md:ml-0">
          {summary.decision && summary.decisionLabel ? (
            <DecisionBadge decision={summary.decision} label={summary.decisionLabel} />
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="size-11 md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? pl.chat.hideDetails : pl.chat.showDetails}</span>
          <ChevronDown aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {/* >= 768 px: always visible. Below: collapsed behind the toggle. */}
      <div data-testid="summary-details-desktop" className="hidden md:grid">
        {details}
      </div>
      {open ? <div className="md:hidden">{details}</div> : null}

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{pl.chat.photoDialogTitle}</DialogTitle>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={summary.productName}
            className="max-h-[70svh] w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
