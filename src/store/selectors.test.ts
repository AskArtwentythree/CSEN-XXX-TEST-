import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { DEFAULT_FILTERS, filterTasks, getDashboardStats, getProjectProgress, getUpcomingTasks, isOverdue, sortTasks } from './selectors';
import { createSeedState } from './seed';

const TODAY = '2026-03-10';
const { tasks } = createSeedState(TODAY);

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'x',
    projectId: 'p',
    title: 'Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isOverdue', () => {
  it('is true only for open tasks due before today', () => {
    expect(isOverdue(makeTask({ dueDate: '2026-03-09' }), TODAY)).toBe(true);
    expect(isOverdue(makeTask({ dueDate: TODAY }), TODAY)).toBe(false);
    expect(isOverdue(makeTask({ dueDate: '2026-03-09', status: 'done' }), TODAY)).toBe(false);
    expect(isOverdue(makeTask({ dueDate: null }), TODAY)).toBe(false);
  });
});

describe('getProjectProgress', () => {
  it('computes done / total / percent', () => {
    expect(getProjectProgress(tasks, 'p-website')).toEqual({ total: 4, done: 1, percent: 25 });
  });

  it('handles projects without tasks', () => {
    expect(getProjectProgress(tasks, 'missing')).toEqual({ total: 0, done: 0, percent: 0 });
  });
});

describe('getDashboardStats', () => {
  it('summarises the seed data', () => {
    expect(getDashboardStats(tasks, TODAY)).toEqual({
      total: 11,
      done: 2,
      inProgress: 2,
      overdue: 1,
      dueThisWeek: 4,
    });
  });
});

describe('getUpcomingTasks', () => {
  it('returns open overdue and soon-due tasks, soonest first', () => {
    const titles = getUpcomingTasks(tasks, TODAY).map((t) => t.title);
    expect(titles[0]).toBe('Fix crash on Android 12');
    expect(titles).not.toContain('Renew SSL certificates');
    expect(titles).not.toContain('App Store screenshots');
  });
});

describe('filterTasks', () => {
  it('matches title, description and tags case-insensitively', () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, query: 'LOGIN' }).map((t) => t.id)).toEqual(['t5']);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, query: 'apple' }).map((t) => t.id)).toEqual(['t5']);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, query: 'android' }).map((t) => t.id)).toEqual(['t7']);
  });

  it('combines status, priority and project filters', () => {
    const result = filterTasks(tasks, {
      ...DEFAULT_FILTERS,
      status: 'todo',
      priority: 'high',
      projectId: 'p-mobile',
    });
    expect(result.map((t) => t.id)).toEqual(['t7']);
  });
});

describe('sortTasks', () => {
  const a = makeTask({ id: 'a', title: 'Bravo', priority: 'low', dueDate: '2026-03-01' });
  const b = makeTask({ id: 'b', title: 'Alpha', priority: 'high', dueDate: null });
  const c = makeTask({ id: 'c', title: 'Charlie', priority: 'medium', dueDate: '2026-02-01' });

  it('sorts by due date with undated tasks last', () => {
    expect(sortTasks([a, b, c], 'dueDate').map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by priority', () => {
    expect(sortTasks([a, b, c], 'priority').map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by title', () => {
    expect(sortTasks([a, b, c], 'title').map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the input', () => {
    const input = [a, b, c];
    sortTasks(input, 'title');
    expect(input.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});
