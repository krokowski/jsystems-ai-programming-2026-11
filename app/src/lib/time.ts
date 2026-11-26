export const APP_TIME_ZONE = "Europe/Warsaw";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO date (YYYY-MM-DD) of `now` in the application time zone. */
export function todayInAppZone(now: Date): string {
  const parts = Object.fromEntries(dayFormat.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** YYYY-MM-DD -> dd.MM.yyyy */
export function formatDatePl(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
