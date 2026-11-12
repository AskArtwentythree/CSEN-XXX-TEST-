import { describe, expect, it } from 'vitest';
import { addMonths, getMonthGrid } from './date';
import { describeRecurrence, nextOccurrence, occurrencesBetween } from './recurrence';

describe('addMonths', () => {
  it('clamps to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
  });
});

describe('getMonthGrid', () => {
  it('returns 42 days starting on the Monday on or before the 1st', () => {
    const grid = getMonthGrid('2026-03'); // March 1 2026 is a Sunday
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-02-23');
    expect(grid[6]).toBe('2026-03-01');
    expect(grid[41]).toBe('2026-04-05');
  });

  it('starts on the 1st when the month begins on Monday', () => {
    expect(getMonthGrid('2026-06')[0]).toBe('2026-06-01');
  });
});

describe('nextOccurrence', () => {
  const today = '2026-03-10';

  it('advances from the due date when completed early', () => {
    expect(nextOccurrence('2026-03-12', { frequency: 'weekly', interval: 1 }, today)).toBe('2026-03-19');
    expect(nextOccurrence('2026-03-12', { frequency: 'daily', interval: 3 }, today)).toBe('2026-03-15');
  });

  it('skips missed occurrences so the next one is in the future', () => {
    expect(nextOccurrence('2026-03-01', { frequency: 'daily', interval: 1 }, today)).toBe('2026-03-11');
    expect(nextOccurrence('2026-02-03', { frequency: 'weekly', interval: 2 }, today)).toBe('2026-03-17');
  });

  it('counts monthly steps from the anchor so clamping does not compound', () => {
    expect(nextOccurrence('2026-01-31', { frequency: 'monthly', interval: 1 }, '2026-03-05')).toBe(
      '2026-03-31',
    );
  });

  it('uses today when the task has no due date', () => {
    expect(nextOccurrence(null, { frequency: 'monthly', interval: 1 }, today)).toBe('2026-04-10');
  });
});

describe('occurrencesBetween', () => {
  it('lists projected dates inside the range, excluding the anchor', () => {
    expect(
      occurrencesBetween('2026-03-02', { frequency: 'weekly', interval: 1 }, '2026-03-01', '2026-03-31'),
    ).toEqual(['2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']);
  });

  it('returns nothing when the series starts after the range', () => {
    expect(
      occurrencesBetween('2026-05-01', { frequency: 'daily', interval: 1 }, '2026-03-01', '2026-03-31'),
    ).toEqual([]);
  });
});

describe('describeRecurrence', () => {
  it('pluralises the unit', () => {
    expect(describeRecurrence({ frequency: 'daily', interval: 1 })).toBe('Every day');
    expect(describeRecurrence({ frequency: 'weekly', interval: 2 })).toBe('Every 2 weeks');
  });
});
