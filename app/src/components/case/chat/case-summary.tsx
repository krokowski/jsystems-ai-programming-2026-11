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
    <div className="mt-3 flex gap-3">
      <Button
        type="button"
        variant="outline"
        aria-label={pl.chat.photoThumbnail}
        className="size-20 shrink-0 overflow-hidden p-0"
        onClick={() => setPhotoOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={summary.thumbnailDataUrl} alt="" className="size-full object-cover" />
      </Button>
      <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="col-span-2 grid grid-cols-subgrid">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <section className="rounded-xl border bg-card p-3 text-sm">
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
          size="sm"
          className="md:hidden"
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
