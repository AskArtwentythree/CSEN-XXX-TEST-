import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  getBlockers,
  getDependents,
  isBlocked,
  sanitizeDependencies,
  wouldCreateCycle,
} from './dependencies';

function task(id: string, dependsOn: string[] = [], status: Task['status'] = 'todo'): Task {
  return {
    id,
    projectId: 'p',
    title: id.toUpperCase(),
    description: '',
    status,
    priority: 'medium',
    dueDate: null,
    tags: [],
    subtasks: [],
    dependsOn,
    recurrence: null,
    createdAt: '',
    updatedAt: '',
  };
}

// a -> b -> c   (a depends on b, b depends on c)
const a = task('a', ['b']);
const b = task('b', ['c']);
const c = task('c');
const d = task('d', ['c'], 'done');
const tasks = [a, b, c, d];

describe('getBlockers / isBlocked', () => {
  it('returns open dependencies only', () => {
    expect(getBlockers(a, tasks).map((t) => t.id)).toEqual(['b']);
    expect(isBlocked(a, tasks)).toBe(true);
    expect(isBlocked(c, tasks)).toBe(false);
  });

  it('is not blocked once dependencies are done', () => {
    const doneC = { ...c, status: 'done' as const };
    expect(isBlocked(b, [a, b, doneC])).toBe(false);
  });

  it('ignores dependencies on deleted tasks', () => {
    expect(getBlockers(task('x', ['missing']), tasks)).toEqual([]);
  });

  it('never reports done tasks as blocked', () => {
    expect(isBlocked(d, tasks)).toBe(false);
  });
});

describe('getDependents', () => {
  it('lists tasks waiting on the given task', () => {
    expect(getDependents('c', tasks).map((t) => t.id)).toEqual(['b', 'd']);
  });
});

describe('wouldCreateCycle', () => {
  it('detects direct and transitive cycles', () => {
    expect(wouldCreateCycle(tasks, 'c', 'c')).toBe(true);
    expect(wouldCreateCycle(tasks, 'b', 'a')).toBe(true);
    expect(wouldCreateCycle(tasks, 'c', 'a')).toBe(true);
  });

  it('allows edges that keep the graph acyclic', () => {
    expect(wouldCreateCycle(tasks, 'a', 'c')).toBe(false);
    expect(wouldCreateCycle(tasks, 'd', 'a')).toBe(false);
  });

  it('respects pending overrides', () => {
    // If c were edited to depend on d, then d -> c would loop.
    const overrides = new Map([['c', ['d']]]);
    expect(wouldCreateCycle(tasks, 'd', 'c', overrides)).toBe(true);
  });
});

describe('sanitizeDependencies', () => {
  it('drops self, unknown, duplicate and cycle-forming ids', () => {
    // b -> a would loop (a already depends on b); b -> d is fine.
    expect(sanitizeDependencies(tasks, 'b', ['b', 'nope', 'd', 'd', 'a'])).toEqual(['d']);
    // Everything is reachable from c's would-be dependencies back to c.
    expect(sanitizeDependencies(tasks, 'c', ['a', 'd'])).toEqual([]);
  });
});
