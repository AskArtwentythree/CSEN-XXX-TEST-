export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Adds calendar months, clamping to the last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const day = Math.min(d, daysInMonth(target.getFullYear(), target.getMonth()));
  return toISODate(new Date(target.getFullYear(), target.getMonth(), day));
}

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function formatMonth(month: string): string {
  return parseISODate(`${month}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** Dates for a 6-week month grid (42 days) starting on Monday. `month` is `YYYY-MM`. */
export function getMonthGrid(month: string): string[] {
  const first = `${month}-01`;
  const weekday = (parseISODate(first).getDay() + 6) % 7; // Monday = 0
  const start = addDays(first, -weekday);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function formatDate(iso: string): string {
  const date = parseISODate(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

export function describeDue(iso: string, today: string): string {
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  if (iso === addDays(today, -1)) return 'Yesterday';
  return formatDate(iso);
}
