import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyMatch } from './fuzzy';

describe('fuzzyMatch', () => {
  it('matches subsequences case-insensitively', () => {
    expect(fuzzyMatch('ntsk', 'New task')).not.toBeNull();
    expect(fuzzyMatch('xyz', 'New task')).toBeNull();
    expect(fuzzyMatch('task', 'tas')).toBeNull();
  });

  it('prefers word starts over earlier letters', () => {
    // "nt" should match N(ew) T(ask), not the "n" and the "t" of "Ne...t".
    expect(fuzzyMatch('nt', 'New task')?.indices).toEqual([0, 4]);
  });

  it('prefers contiguous runs', () => {
    expect(fuzzyMatch('log', 'Implement login screen')?.indices).toEqual([10, 11, 12]);
  });

  it('matches each query word independently, in any order', () => {
    expect(fuzzyMatch('go set', 'Go to Settings')).not.toBeNull();
    expect(fuzzyMatch('android crash', 'Fix crash on Android 12')).not.toBeNull();
    expect(fuzzyMatch('android crash', 'Android release')).toBeNull();
  });
});

describe('fuzzyFilter', () => {
  const items = ['Settings', 'Set up analytics events', 'Rotate API keys', 'Go to Settings'];

  it('ranks better matches first and drops non-matches', () => {
    const ranked = fuzzyFilter(items, 'sett', (s) => s).map((r) => r.item);
    expect(ranked[0]).toBe('Settings');
    expect(ranked).not.toContain('Rotate API keys');
  });

  it('keeps input order for an empty query', () => {
    expect(fuzzyFilter(items, '', (s) => s).map((r) => r.item)).toEqual(items);
  });
});
