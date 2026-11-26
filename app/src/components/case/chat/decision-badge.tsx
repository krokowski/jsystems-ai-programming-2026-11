import { Check, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Decision } from "@/lib/schemas";
import { pl } from "@/lib/i18n-pl";
import { cn } from "@/lib/utils";

const TONES: Record<Decision, string> = {
  approve: "border-(--color-decision-approve) bg-(--color-decision-approve)/15",
  reject: "border-(--color-decision-reject) bg-(--color-decision-reject)/15",
  manual_review: "border-(--color-decision-review) bg-(--color-decision-review)/15",
};

const ICON_TONES: Record<Decision, string> = {
  approve: "text-(--color-decision-approve)",
  reject: "text-(--color-decision-reject)",
  manual_review: "text-(--color-decision-review)",
};

export function DecisionIcon({ decision, className }: { decision: Decision; className?: string }) {
  const classes = cn("size-3.5 shrink-0", ICON_TONES[decision], className);
  if (decision === "approve") {
    return <Check aria-hidden="true" className={classes} />;
  }
  if (decision === "reject") {
    return <X aria-hidden="true" className={classes} />;
  }
  return <Clock aria-hidden="true" className={classes} />;
}

export function decisionTone(decision: Decision): string {
  return TONES[decision];
}

export function DecisionBadge({
  decision,
  label,
  className,
}: {
  decision: Decision;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      data-decision={decision}
      variant="outline"
      className={cn("h-auto gap-1.5 py-1 text-foreground", TONES[decision], className)}
    >
      <DecisionIcon decision={decision} />
      <span>{pl.decision.badgePrefix}</span>{" "}
      <span className="font-semibold">{label}</span>
    </Badge>
  );
}
