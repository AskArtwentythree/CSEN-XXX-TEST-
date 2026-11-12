import type { Task } from '../types';

/** Open tasks that `task` is waiting on. */
export function getBlockers(task: Task, tasks: Task[]): Task[] {
  if (task.dependsOn.length === 0) return [];
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return task.dependsOn
    .map((id) => byId.get(id))
    .filter((t): t is Task => t !== undefined && t.status !== 'done');
}

export function isBlocked(task: Task, tasks: Task[]): boolean {
  return task.status !== 'done' && getBlockers(task, tasks).length > 0;
}

/** Tasks that list `taskId` as a dependency. */
export function getDependents(taskId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.dependsOn.includes(taskId));
}

/**
 * True if making `taskId` depend on `dependencyId` would close a loop, i.e.
 * `dependencyId` already (transitively) depends on `taskId`. `overrides` lets
 * callers test a pending, unsaved dependency list for `taskId`.
 */
export function wouldCreateCycle(
  tasks: Task[],
  taskId: string,
  dependencyId: string,
  overrides?: ReadonlyMap<string, readonly string[]>,
): boolean {
  if (taskId === dependencyId) return true;
  const edges = new Map<string, readonly string[]>(tasks.map((t) => [t.id, t.dependsOn]));
  overrides?.forEach((deps, id) => edges.set(id, deps));

  const seen = new Set<string>();
  const stack = [dependencyId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === taskId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(edges.get(id) ?? []));
  }
  return false;
}

/**
 * Normalises a proposed dependency list: drops self-references, unknown ids,
 * duplicates and any edge that would introduce a cycle. Edges are accepted in
 * order, so earlier entries win when two would conflict.
 */
export function sanitizeDependencies(tasks: Task[], taskId: string, proposed: string[]): string[] {
  const known = new Set(tasks.map((t) => t.id));
  const accepted: string[] = [];
  for (const id of proposed) {
    if (!known.has(id) || accepted.includes(id)) continue;
    const pending = new Map([[taskId, accepted]]);
    if (!wouldCreateCycle(tasks, taskId, id, pending)) accepted.push(id);
  }
  return accepted;
}
