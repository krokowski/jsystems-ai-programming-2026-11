import type { Decision } from "../schemas/enums";

const labels: Record<Decision, string> = {
  approve: "Zaakceptowano",
  reject: "Odrzucono",
  manual_review: "Do weryfikacji przez pracownika",
};

export const decision = {
  labels,
  badgePrefix: "Decyzja:",
  updatedHeader: (label: string): string => `Zaktualizowana decyzja: ${label}`,
  justificationHeading: "### Uzasadnienie",
  nextStepsHeading: "### Następne kroki",
  rulesLine: (ids: readonly string[]): string => `Zastosowane zasady: ${ids.join(", ")}`,
  disclaimer:
    "To jest wstępna decyzja. Ostateczna decyzja zostanie podjęta po oględzinach produktu przez nasz serwis.",
} as const;
