import { PRIORITIES, STATUSES, THEMES, type AppState, type Project, type Task } from '../types';
import { todayISO } from '../utils/date';
import { createSeedState } from './seed';

/** Also read by the inline theme script in index.html. */
export const STORAGE_KEY = 'taskflow:state:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProject(value: unknown): value is Project {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.color === 'string'
  );
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    STATUSES.includes(value.status as Task['status']) &&
    PRIORITIES.includes(value.priority as Task['priority']) &&
    (value.dueDate === null || typeof value.dueDate === 'string') &&
    Array.isArray(value.tags)
  );
}

export function isAppState(value: unknown): value is AppState {
  return (
    isRecord(value) &&
    Array.isArray(value.projects) &&
    Array.isArray(value.tasks) &&
    THEMES.includes(value.theme as AppState['theme']) &&
    value.projects.every(isProject) &&
    value.tasks.every(isTask)
  );
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isAppState(parsed)) return parsed;
    }
  } catch {
    // Corrupt or inaccessible storage: fall back to sample data.
  }
  return createSeedState(todayISO());
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled (e.g. private mode); the app keeps working in memory.
  }
}
