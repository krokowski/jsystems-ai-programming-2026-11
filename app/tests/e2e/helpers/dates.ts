const TZ = "Europe/Warsaw";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parts(date: Date): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const [y = "0", m = "0", d = "0"] = fmt.format(date).split("-");
  return { y: Number(y), m: Number(m), d: Number(d) };
}

export function todayWarsaw(): string {
  const { y, m, d } = parts(new Date());
  return toIso(y, m, d);
}

export function daysAgo(n: number): string {
  const { y, m, d } = parts(new Date());
  const dt = new Date(Date.UTC(y, m - 1, d - n));
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function daysAhead(n: number): string {
  return daysAgo(-n);
}

export function monthsAgo(n: number): string {
  const { y, m, d } = parts(new Date());
  const total = y * 12 + (m - 1) - n;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return toIso(ty, tm, Math.min(d, lastDay));
}

const MONTHS_GENITIVE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

/** Accepted renderings of an ISO date in an assistant reply (ADR-005 A13). */
export function dateVariants(iso: string): RegExp {
  const [y = "", m = "", d = ""] = iso.split("-");
  const long = `${Number(d)} ${MONTHS_GENITIVE[Number(m) - 1]} ${y}`;
  return new RegExp(`${iso}|${d}\\.${m}\\.${y}|${long}`);
}
