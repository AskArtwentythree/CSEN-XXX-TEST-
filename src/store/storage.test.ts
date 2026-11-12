import { describe, expect, it } from 'vitest';
import { createSeedState } from './seed';
import { STORAGE_KEY, loadState, parseAppState, saveState } from './storage';

describe('parseAppState', () => {
  it('accepts valid state', () => {
    const state = createSeedState('2026-03-10');
    expect(parseAppState(state)).toEqual(state);
  });

  it.each([
    ['null', null],
    ['missing tasks', { projects: [], theme: 'light' }],
    ['bad theme', { projects: [], tasks: [], theme: 'neon' }],
    ['bad task status', { projects: [], tasks: [{ id: '1', projectId: 'p', title: 't', description: '', status: 'nope', priority: 'low', dueDate: null, tags: [] }], theme: 'light' }],
  ])('rejects %s', (_label, value) => {
    expect(parseAppState(value)).toBeNull();
  });
});

describe('parseAppState migration', () => {
  const v1Task = {
    id: 'a',
    projectId: 'p',
    title: 'Old task',
    description: '',
    status: 'todo',
    priority: 'low',
    dueDate: null,
    tags: [],
    createdAt: '',
    updatedAt: '',
  };
  const project = { id: 'p', name: 'P', description: '', color: '#000', createdAt: '' };

  it('fills in fields that older saves do not have', () => {
    const parsed = parseAppState({ projects: [project], tasks: [v1Task], theme: 'light' });
    expect(parsed?.tasks[0]).toMatchObject({ subtasks: [], dependsOn: [], recurrence: null });
  });

  it('drops dangling and cyclic dependencies from hand-edited backups', () => {
    const parsed = parseAppState({
      projects: [project],
      tasks: [
        { ...v1Task, id: 'a', dependsOn: ['b', 'ghost'] },
        { ...v1Task, id: 'b', dependsOn: ['a'] },
      ],
      theme: 'light',
    });
    expect(parsed?.tasks.map((t) => t.dependsOn)).toEqual([['b'], []]);
  });

  it('rejects malformed new fields', () => {
    expect(
      parseAppState({
        projects: [project],
        tasks: [{ ...v1Task, recurrence: { frequency: 'yearly', interval: 1 } }],
        theme: 'light',
      }),
    ).toBeNull();
    expect(
      parseAppState({ projects: [project], tasks: [{ ...v1Task, subtasks: [{ id: 1 }] }], theme: 'light' }),
    ).toBeNull();
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
