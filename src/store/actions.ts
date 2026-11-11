import type { AppState, Project, ProjectInput, Task, TaskInput, TaskStatus, Theme } from '../types';
import { createId } from '../utils/id';

export type Action =
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; id: string; changes: Partial<ProjectInput> }
  | { type: 'project/delete'; id: string }
  | { type: 'task/add'; task: Task }
  | { type: 'task/update'; id: string; changes: Partial<TaskInput>; now: string }
  | { type: 'task/delete'; id: string }
  | { type: 'theme/set'; theme: Theme }
  | { type: 'state/replace'; state: AppState };

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
    return { type: 'task/update', id, changes, now: new Date().toISOString() };
  },
  moveTask(id: string, status: TaskStatus): Action {
    return actions.updateTask(id, { status });
  },
  deleteTask(id: string): Action {
    return { type: 'task/delete', id };
  },
  setTheme(theme: Theme): Action {
    return { type: 'theme/set', theme };
  },
  replaceState(state: AppState): Action {
    return { type: 'state/replace', state };
  },
};
