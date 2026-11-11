import type { AppState, Priority, Project, Task, TaskStatus } from '../types';
import { addDays } from '../utils/date';

export function createSeedState(today: string): AppState {
  const createdAt = new Date().toISOString();

  const projects: Project[] = [
    {
      id: 'p-website',
      name: 'Website Redesign',
      description: 'Refresh the marketing site with the new brand.',
      color: '#6366f1',
      createdAt,
    },
    {
      id: 'p-mobile',
      name: 'Mobile App',
      description: 'Ship v1 of the iOS and Android apps.',
      color: '#10b981',
      createdAt,
    },
    {
      id: 'p-ops',
      name: 'Operations',
      description: 'Internal tooling and housekeeping.',
      color: '#f59e0b',
      createdAt,
    },
  ];

  const task = (
    id: string,
    projectId: string,
    title: string,
    status: TaskStatus,
    priority: Priority,
    dueInDays: number | null,
    tags: string[],
    description = '',
  ): Task => ({
    id,
    projectId,
    title,
    description,
    status,
    priority,
    dueDate: dueInDays === null ? null : addDays(today, dueInDays),
    tags,
    createdAt,
    updatedAt: createdAt,
  });

  const tasks: Task[] = [
    task('t1', 'p-website', 'Audit current site content', 'done', 'medium', -6, ['content']),
    task('t2', 'p-website', 'Design new homepage hero', 'in_progress', 'high', 2, ['design'],
      'Explore three directions and review with marketing.'),
    task('t3', 'p-website', 'Write copy for pricing page', 'todo', 'medium', 5, ['content']),
    task('t4', 'p-website', 'Set up analytics events', 'todo', 'low', null, ['dev', 'analytics']),
    task('t5', 'p-mobile', 'Implement login screen', 'in_progress', 'high', 1, ['dev', 'auth'],
      'Email + password and Sign in with Apple.'),
    task('t6', 'p-mobile', 'Push notification permissions', 'todo', 'medium', 9, ['dev']),
    task('t7', 'p-mobile', 'Fix crash on Android 12', 'todo', 'high', -1, ['bug', 'android']),
    task('t8', 'p-mobile', 'App Store screenshots', 'todo', 'low', 14, ['design', 'release']),
    task('t9', 'p-ops', 'Renew SSL certificates', 'done', 'high', -3, ['infra']),
    task('t10', 'p-ops', 'Rotate API keys', 'todo', 'medium', 0, ['security', 'infra']),
    task('t11', 'p-ops', 'Clean up old staging servers', 'todo', 'low', 20, ['infra']),
  ];

  return { projects, tasks, theme: 'system' };
}
