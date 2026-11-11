import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import { STORAGE_KEY, isAppState, loadState, saveState } from './storage';

describe('isAppState', () => {
  it('accepts valid state', () => {
    expect(isAppState(createSeedState('2026-03-10'))).toBe(true);
  });

  it.each([
    ['null', null],
    ['missing tasks', { projects: [], theme: 'light' }],
    ['bad theme', { projects: [], tasks: [], theme: 'neon' }],
    ['bad task status', { projects: [], tasks: [{ id: '1', projectId: 'p', title: 't', description: '', status: 'nope', priority: 'low', dueDate: null, tags: [] }], theme: 'light' }],
  ])('rejects %s', (_label, value) => {
    expect(isAppState(value)).toBe(false);
  });
});

describe('loadState / saveState', () => {
  it('round-trips through localStorage', () => {
    const state = { ...createSeedState('2026-03-10'), theme: 'dark' as const };
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it('falls back to sample data when storage is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadState().projects.length).toBeGreaterThan(0);
  });
});
