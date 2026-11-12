import type { AppState, Task } from '../types';
import { nextOccurrence } from '../utils/recurrence';
import type { Action } from './actions';
import { getBlockers, sanitizeDependencies } from './dependencies';

function withoutDependencies(tasks: Task[], removedIds: Set<string>): Task[] {
  if (removedIds.size === 0) return tasks;
  return tasks.map((t) =>
    t.dependsOn.some((id) => removedIds.has(id))
      ? { ...t, dependsOn: t.dependsOn.filter((id) => !removedIds.has(id)) }
      : t,
  );
}

function updateTask(state: AppState, action: Extract<Action, { type: 'task/update' }>): AppState {
  const current = state.tasks.find((t) => t.id === action.id);
  if (!current) return state;

  let updated: Task = { ...current, ...action.changes, updatedAt: action.now };
  if (action.changes.dependsOn) {
    updated.dependsOn = sanitizeDependencies(state.tasks, current.id, action.changes.dependsOn);
  }

  const completing = updated.status === 'done' && current.status !== 'done';
  if (completing && getBlockers(updated, state.tasks).length > 0) {
    // A task can't be finished while it is still waiting on others.
    updated = { ...updated, status: current.status };
  }

  const tasks = state.tasks.map((t) => (t.id === current.id ? updated : t));

  if (updated.status === 'done' && current.status !== 'done' && updated.recurrence) {
    // The series moves to the new instance so re-opening and re-completing
    // this one doesn't spawn duplicates.
    const next: Task = {
      ...updated,
      id: action.spawnId,
      status: 'todo',
      dueDate: nextOccurrence(updated.dueDate, updated.recurrence, action.today),
      subtasks: updated.subtasks.map((s) => ({ ...s, done: false })),
      dependsOn: [],
      createdAt: action.now,
    };
    const index = tasks.findIndex((t) => t.id === current.id);
    tasks[index] = { ...updated, recurrence: null };
    tasks.push(next);
  }

  return { ...state, tasks };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'project/add':
      return { ...state, projects: [...state.projects, action.project] };
    case 'project/update':
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.id ? { ...p, ...action.changes } : p)),
      };
    case 'project/delete': {
      const removed = new Set(
        state.tasks.filter((t) => t.projectId === action.id).map((t) => t.id),
      );
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        tasks: withoutDependencies(
          state.tasks.filter((t) => !removed.has(t.id)),
          removed,
        ),
      };
    }
    case 'task/add': {
      const task = {
        ...action.task,
        dependsOn: sanitizeDependencies(state.tasks, action.task.id, action.task.dependsOn),
      };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case 'task/update':
      return updateTask(state, action);
    case 'task/delete':
      if (!state.tasks.some((t) => t.id === action.id)) return state;
      return {
        ...state,
        tasks: withoutDependencies(
          state.tasks.filter((t) => t.id !== action.id),
          new Set([action.id]),
        ),
      };
    case 'restore': {
      const { snapshot } = action;
      const projectIds = new Set(state.projects.map((p) => p.id));
      const projects = [
        ...state.projects,
        ...snapshot.projects.filter((p) => !projectIds.has(p.id)),
      ];
      const validProjects = new Set(projects.map((p) => p.id));
      const taskIds = new Set(state.tasks.map((t) => t.id));
      const restored = snapshot.tasks.filter(
        (t) => !taskIds.has(t.id) && validProjects.has(t.projectId),
      );
      const known = new Set([...taskIds, ...restored.map((t) => t.id)]);
      let tasks = [
        ...state.tasks,
        // Anything they depended on may have been deleted in the meantime.
        ...restored.map((t) => ({ ...t, dependsOn: t.dependsOn.filter((id) => known.has(id)) })),
      ];
      for (const [dependentId, dependencyId] of snapshot.links) {
        const dependent = tasks.find((t) => t.id === dependentId);
        if (!dependent || dependent.dependsOn.includes(dependencyId)) continue;
        const dependsOn = sanitizeDependencies(tasks, dependentId, [
          ...dependent.dependsOn,
          dependencyId,
        ]);
        tasks = tasks.map((t) => (t.id === dependentId ? { ...t, dependsOn } : t));
      }
      return { ...state, projects, tasks };
    }
    case 'theme/set':
      return { ...state, theme: action.theme };
    case 'state/replace':
      return action.state;
    default:
      return state;
  }
}
