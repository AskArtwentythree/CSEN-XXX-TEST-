import type { AppState, Project, ProjectInput, Task, TaskInput, TaskStatus, Theme } from '../types';
import { todayISO } from '../utils/date';
import { createId } from '../utils/id';

export type Action =
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; id: string; changes: Partial<ProjectInput> }
  | { type: 'project/delete'; id: string }
  | { type: 'task/add'; task: Task }
  | {
      type: 'task/update';
      id: string;
      changes: Partial<TaskInput>;
      now: string;
      today: string;
      /** Id for the next instance if this update completes a recurring task. */
      spawnId: string;
    }
  | { type: 'task/delete'; id: string }
  | { type: 'restore'; snapshot: DeletionSnapshot }
  | { type: 'theme/set'; theme: Theme }
  | { type: 'state/replace'; state: AppState }
  | { type: 'history/undo' }
  | { type: 'history/redo' };

/** Everything a delete removes, so it can be put back later. */
export interface DeletionSnapshot {
  projects: Project[];
  tasks: Task[];
  /** `[dependentId, dependencyId]` edges from surviving tasks to deleted ones. */
  links: Array<[string, string]>;
}

export function getDeletionSnapshot(
  state: AppState,
  target: { taskId: string } | { projectId: string },
): DeletionSnapshot {
  const projects = 'projectId' in target ? state.projects.filter((p) => p.id === target.projectId) : [];
  const tasks =
    'projectId' in target
      ? state.tasks.filter((t) => t.projectId === target.projectId)
      : state.tasks.filter((t) => t.id === target.taskId);
  const removed = new Set(tasks.map((t) => t.id));
  const links: Array<[string, string]> = [];
  for (const t of state.tasks) {
    if (removed.has(t.id)) continue;
    for (const dep of t.dependsOn) if (removed.has(dep)) links.push([t.id, dep]);
  }
  return { projects, tasks, links };
}

/** Action creators own ids and timestamps so the reducer stays pure. */
export const actions = {
  addProject(input: ProjectInput): Action {
    return {
      type: 'project/add',
      project: { ...input, id: createId(), createdAt: new Date().toISOString() },
    };
  },
  updateProject(id: string, changes: Partial<ProjectInput>): Action {
    return { type: 'project/update', id, changes };
  },
  deleteProject(id: string): Action {
    return { type: 'project/delete', id };
  },
  addTask(input: TaskInput): Action {
    const now = new Date().toISOString();
    return { type: 'task/add', task: { ...input, id: createId(), createdAt: now, updatedAt: now } };
  },
  updateTask(id: string, changes: Partial<TaskInput>): Action {
    return {
      type: 'task/update',
      id,
      changes,
      now: new Date().toISOString(),
      today: todayISO(),
      spawnId: createId(),
    };
  },
  moveTask(id: string, status: TaskStatus): Action {
    return actions.updateTask(id, { status });
  },
  deleteTask(id: string): Action {
    return { type: 'task/delete', id };
  },
  restore(snapshot: DeletionSnapshot): Action {
    return { type: 'restore', snapshot };
  },
  setTheme(theme: Theme): Action {
    return { type: 'theme/set', theme };
  },
  replaceState(state: AppState): Action {
    return { type: 'state/replace', state };
  },
  undo(): Action {
    return { type: 'history/undo' };
  },
  redo(): Action {
    return { type: 'history/redo' };
  },
};
