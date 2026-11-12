import {
  PRIORITIES,
  RECURRENCE_FREQUENCIES,
  STATUSES,
  THEMES,
  type AppState,
  type Project,
  type Recurrence,
  type Subtask,
  type Task,
} from '../types';
import { todayISO } from '../utils/date';
import { sanitizeDependencies } from './dependencies';
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

function isSubtask(value: unknown): value is Subtask {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.done === 'boolean'
  );
}

function isRecurrence(value: unknown): value is Recurrence {
  return (
    isRecord(value) &&
    RECURRENCE_FREQUENCIES.includes(value.frequency as Recurrence['frequency']) &&
    Number.isInteger(value.interval) &&
    (value.interval as number) >= 1
  );
}

/** Fields added after v1 are optional so older saves and backups still load. */
type StoredTask = Omit<Task, 'subtasks' | 'dependsOn' | 'recurrence'> &
  Partial<Pick<Task, 'subtasks' | 'dependsOn' | 'recurrence'>>;

function isStoredTask(value: unknown): value is StoredTask {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    STATUSES.includes(value.status as Task['status']) &&
    PRIORITIES.includes(value.priority as Task['priority']) &&
    (value.dueDate === null || typeof value.dueDate === 'string') &&
    Array.isArray(value.tags) &&
    (value.subtasks === undefined ||
      (Array.isArray(value.subtasks) && value.subtasks.every(isSubtask))) &&
    (value.dependsOn === undefined ||
      (Array.isArray(value.dependsOn) && value.dependsOn.every((id) => typeof id === 'string'))) &&
    (value.recurrence === undefined || value.recurrence === null || isRecurrence(value.recurrence))
  );
}

/**
 * Validates untrusted data (localStorage or an imported backup) and upgrades
 * it to the current shape. Returns `null` if it isn't a Taskflow state.
 */
export function parseAppState(value: unknown): AppState | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.projects) ||
    !Array.isArray(value.tasks) ||
    !THEMES.includes(value.theme as AppState['theme']) ||
    !value.projects.every(isProject) ||
    !value.tasks.every(isStoredTask)
  ) {
    return null;
  }

  const stored = value.tasks as StoredTask[];
  const tasks: Task[] = stored.map((t) => ({
    ...t,
    subtasks: t.subtasks ?? [],
    dependsOn: [],
    recurrence: t.recurrence ?? null,
  }));
  // Re-add dependencies one task at a time so dangling ids and cycles in
  // hand-edited backups are dropped instead of breaking the app.
  stored.forEach((t, i) => {
    tasks[i].dependsOn = sanitizeDependencies(tasks, t.id, t.dependsOn ?? []);
  });

  return { projects: value.projects as Project[], tasks, theme: value.theme as AppState['theme'] };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = parseAppState(JSON.parse(raw));
      if (parsed) return parsed;
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
