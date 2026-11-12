export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type Theme = 'light' | 'dark' | 'system';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  /** Repeat every `interval` days / weeks / months. Always >= 1. */
  interval: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  /** Local calendar date in `YYYY-MM-DD` form. */
  dueDate: string | null;
  tags: string[];
  subtasks: Subtask[];
  /** Ids of tasks that must be done before this one can be completed. */
  dependsOn: string[];
  recurrence: Recurrence | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt'>;
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export interface AppState {
  projects: Project[];
  tasks: Task[];
  theme: Theme;
}

export const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
export const THEMES: Theme[] = ['light', 'dark', 'system'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly'];

export const RECURRENCE_UNITS: Record<RecurrenceFrequency, [singular: string, plural: string]> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PROJECT_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Violet', value: '#8b5cf6' },
];
