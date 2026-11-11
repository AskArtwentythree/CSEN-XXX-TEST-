import type { Priority, Task, TaskStatus } from '../types';
import { addDays } from '../utils/date';

export type SortKey = 'dueDate' | 'priority' | 'createdAt' | 'title';
export const SORT_KEYS: SortKey[] = ['dueDate', 'priority', 'createdAt', 'title'];
export const SORT_LABELS: Record<SortKey, string> = {
  dueDate: 'Due date',
  priority: 'Priority',
  createdAt: 'Newest',
  title: 'Title',
};

export interface TaskFilters {
  query: string;
  status: TaskStatus | 'all';
  priority: Priority | 'all';
  projectId: string | 'all';
}

export const DEFAULT_FILTERS: TaskFilters = {
  query: '',
  status: 'all',
  priority: 'all',
  projectId: 'all',
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function isOverdue(task: Task, today: string): boolean {
  return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}

export function getProjectProgress(tasks: Task[], projectId: string) {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const done = projectTasks.filter((t) => t.status === 'done').length;
  return {
    total: projectTasks.length,
    done,
    percent: projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0,
  };
}

export function getDashboardStats(tasks: Task[], today: string) {
  const weekEnd = addDays(today, 7);
  const open = tasks.filter((t) => t.status !== 'done');
  return {
    total: tasks.length,
    done: tasks.length - open.length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    dueThisWeek: open.filter((t) => t.dueDate !== null && t.dueDate >= today && t.dueDate <= weekEnd)
      .length,
  };
}

/** Open tasks that are overdue or due within `days` days, soonest first. */
export function getUpcomingTasks(tasks: Task[], today: string, days = 7): Task[] {
  const end = addDays(today, days);
  return sortTasks(
    tasks.filter((t) => t.status !== 'done' && t.dueDate !== null && t.dueDate <= end),
    'dueDate',
  );
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const query = filters.query.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (filters.status === 'all' || t.status === filters.status) &&
      (filters.priority === 'all' || t.priority === filters.priority) &&
      (filters.projectId === 'all' || t.projectId === filters.projectId) &&
      (!query ||
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some((tag) => tag.includes(query))),
  );
}

function compareDue(a: Task, b: Task): number {
  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

function comparePriority(a: Task, b: Task): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const sorted = [...tasks];
  switch (key) {
    case 'dueDate':
      return sorted.sort((a, b) => compareDue(a, b) || comparePriority(a, b));
    case 'priority':
      return sorted.sort((a, b) => comparePriority(a, b) || compareDue(a, b));
    case 'createdAt':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
}
