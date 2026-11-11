import { describe, expect, it } from 'vitest';
import { addDays, describeDue } from './date';
import { oneOf } from './params';
import { parseTags } from './tags';

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('describeDue', () => {
  it('uses relative words near today', () => {
    expect(describeDue('2026-03-10', '2026-03-10')).toBe('Today');
    expect(describeDue('2026-03-11', '2026-03-10')).toBe('Tomorrow');
    expect(describeDue('2026-03-09', '2026-03-10')).toBe('Yesterday');
  });
});

describe('parseTags', () => {
  it('trims, lowercases, strips # and de-duplicates', () => {
    expect(parseTags(' Design, #bug,, design ,Release ')).toEqual(['design', 'bug', 'release']);
  });
});

describe('oneOf', () => {
  it('returns the value only when allowed', () => {
    expect(oneOf('b', ['a', 'b'], 'a')).toBe('b');
    expect(oneOf('z', ['a', 'b'], 'a')).toBe('a');
    expect(oneOf(null, ['a', 'b'], 'a')).toBe('a');
  });
});
