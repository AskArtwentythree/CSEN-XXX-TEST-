import { RECURRENCE_UNITS, type Recurrence } from '../types';
import { addDays, addMonths } from './date';

/** Guards against runaway loops when rolling a long-overdue series forward. */
const MAX_STEPS = 5000;

export function advance(iso: string, recurrence: Recurrence, steps = 1): string {
  const { frequency, interval } = recurrence;
  switch (frequency) {
    case 'daily':
      return addDays(iso, interval * steps);
    case 'weekly':
      return addDays(iso, 7 * interval * steps);
    case 'monthly':
      return addMonths(iso, interval * steps);
  }
}

/**
 * Due date for the next instance after completing a recurring task.
 * Starts from the current due date (or today if unscheduled) and skips any
 * occurrences that are already in the past, so finishing an overdue daily
 * task schedules tomorrow rather than a backlog of missed days.
 *
 * Steps are counted from the anchor rather than chained, so skipping months
 * never compounds day clamping (Jan 31 -> Mar 31, not Jan 31 -> Feb 28 -> Mar 28).
 */
export function nextOccurrence(
  dueDate: string | null,
  recurrence: Recurrence,
  today: string,
): string {
  const anchor = dueDate ?? today;
  let steps = 1;
  let next = advance(anchor, recurrence, steps);
  while (next <= today && steps < MAX_STEPS) {
    steps += 1;
    next = advance(anchor, recurrence, steps);
  }
  return next;
}

/** Projected due dates of a series within `[from, to]`, excluding `anchor` itself. */
export function occurrencesBetween(
  anchor: string,
  recurrence: Recurrence,
  from: string,
  to: string,
): string[] {
  const dates: string[] = [];
  for (let steps = 1; steps < MAX_STEPS; steps++) {
    const next = advance(anchor, recurrence, steps);
    if (next > to) break;
    if (next >= from) dates.push(next);
  }
  return dates;
}

export function describeRecurrence({ frequency, interval }: Recurrence): string {
  const [singular, plural] = RECURRENCE_UNITS[frequency];
  return interval === 1 ? `Every ${singular}` : `Every ${interval} ${plural}`;
}
