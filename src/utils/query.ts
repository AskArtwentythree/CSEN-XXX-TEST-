import { getBlockers } from '../store/dependencies';
import { PRIORITIES, type Priority, type Project, type Task, type TaskStatus } from '../types';
import { ISO_DATE_RE, addDays } from './date';

/**
 * A tiny search language for tasks. Terms are ANDed; prefix with `-` to negate.
 *
 *   free text / "exact phrase"   title, description or tags contain it
 *   #tag  tag:name               has the tag
 *   priority:high  p:low         priority
 *   status:todo|progress|done    status
 *   project:mobile               project name contains it
 *   is:overdue|blocked|open|done|recurring|unscheduled|subtasks
 *   due:today|tomorrow|week|overdue|none
 *   due:<7d  due:>=2026-03-01    relative days or absolute dates, ops < <= > >= =
 */
export type IsFlag =
  | 'overdue'
  | 'blocked'
  | 'open'
  | 'done'
  | 'recurring'
  | 'unscheduled'
  | 'subtasks';

const IS_FLAGS: IsFlag[] = ['overdue', 'blocked', 'open', 'done', 'recurring', 'unscheduled', 'subtasks'];

type CompareOp = '<' | '<=' | '>' | '>=' | '=';
export type DueTerm =
  | { kind: 'keyword'; keyword: 'today' | 'tomorrow' | 'week' | 'overdue' | 'none' }
  | { kind: 'compare'; op: CompareOp; date: string }
  | { kind: 'relative'; op: CompareOp; days: number };

export type Clause = { negate: boolean } & (
  | { field: 'text'; value: string }
  | { field: 'tag'; value: string }
  | { field: 'priority'; value: Priority }
  | { field: 'status'; value: TaskStatus }
  | { field: 'project'; value: string }
  | { field: 'is'; value: IsFlag }
  | { field: 'due'; value: DueTerm }
);

export interface ParsedQuery {
  clauses: Clause[];
  /** Human-readable problems, e.g. unknown values. Invalid terms are ignored. */
  errors: string[];
}

export interface QueryContext {
  today: string;
  projects: Project[];
  /** All tasks, used to resolve dependencies for `is:blocked`. */
  allTasks: Task[];
}

const STATUS_ALIASES: Record<string, TaskStatus> = {
  todo: 'todo',
  open: 'todo',
  progress: 'in_progress',
  in_progress: 'in_progress',
  doing: 'in_progress',
  done: 'done',
  closed: 'done',
};

const PRIORITY_ALIASES: Record<string, Priority> = { med: 'medium', hi: 'high', lo: 'low' };

const FIELD_ALIASES: Record<string, Clause['field']> = {
  tag: 'tag',
  t: 'tag',
  priority: 'priority',
  p: 'priority',
  status: 'status',
  s: 'status',
  project: 'project',
  in: 'project',
  is: 'is',
  due: 'due',
};

const TOKEN_RE = /(-?)(?:([a-z_]+):)?(?:"([^"]*)"?|(\S+))/gi;

function parseDue(raw: string): DueTerm | null {
  const keyword = raw as Extract<DueTerm, { kind: 'keyword' }>['keyword'];
  if (['today', 'tomorrow', 'week', 'overdue', 'none'].includes(keyword)) {
    return { kind: 'keyword', keyword };
  }
  const match = /^(<=|>=|<|>|=)?(.+)$/.exec(raw);
  if (!match) return null;
  const op = (match[1] ?? '=') as CompareOp;
  const rest = match[2];
  if (ISO_DATE_RE.test(rest)) return { kind: 'compare', op, date: rest };
  const relative = /^(-?\d+)d$/.exec(rest);
  if (relative) return { kind: 'relative', op, days: Number(relative[1]) };
  return null;
}

function parseValue(field: Clause['field'], raw: string): Clause['value'] | null {
  const value = raw.toLowerCase();
  switch (field) {
    case 'text':
    case 'project':
      return value;
    case 'tag':
      return value.replace(/^#/, '') || null;
    case 'priority':
      return PRIORITIES.includes(value as Priority)
        ? (value as Priority)
        : (PRIORITY_ALIASES[value] ?? null);
    case 'status':
      return STATUS_ALIASES[value] ?? null;
    case 'is':
      return IS_FLAGS.includes(value as IsFlag) ? (value as IsFlag) : null;
    case 'due':
      return parseDue(value);
  }
}

export function parseQuery(input: string): ParsedQuery {
  const clauses: Clause[] = [];
  const errors: string[] = [];

  for (const match of input.matchAll(TOKEN_RE)) {
    const [whole, minus, key, quoted, bare] = match;
    const negate = minus === '-';
    const raw = quoted ?? bare ?? '';
    const field = key ? FIELD_ALIASES[key.toLowerCase()] : undefined;

    if (key && !field) {
      // Unknown prefix such as "re:" is just text.
      clauses.push({ field: 'text', value: whole.slice(negate ? 1 : 0).toLowerCase(), negate });
      continue;
    }
    if (!field && raw.startsWith('#') && raw.length > 1) {
      clauses.push({ field: 'tag', value: raw.slice(1).toLowerCase(), negate });
      continue;
    }
    if (!field) {
      if (raw) clauses.push({ field: 'text', value: raw.toLowerCase(), negate });
      continue;
    }

    const value = parseValue(field, raw);
    if (value === null || value === '') {
      errors.push(`Unknown ${key} value "${raw}"`);
      continue;
    }
    clauses.push({ field, value, negate } as Clause);
  }

  return { clauses, errors };
}

function compare(a: string, op: CompareOp, b: string): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '=':
      return a === b;
  }
}

function matchesDue(task: Task, term: DueTerm, today: string): boolean {
  const due = task.dueDate;
  if (term.kind === 'keyword') {
    switch (term.keyword) {
      case 'none':
        return due === null;
      case 'today':
        return due === today;
      case 'tomorrow':
        return due === addDays(today, 1);
      case 'week':
        return due !== null && due >= today && due <= addDays(today, 7);
      case 'overdue':
        return due !== null && due < today && task.status !== 'done';
    }
  }
  if (due === null) return false;
  const target = term.kind === 'compare' ? term.date : addDays(today, term.days);
  return compare(due, term.op, target);
}

function matchesClause(task: Task, clause: Clause, ctx: QueryContext): boolean {
  switch (clause.field) {
    case 'text':
      return (
        task.title.toLowerCase().includes(clause.value) ||
        task.description.toLowerCase().includes(clause.value) ||
        task.tags.some((tag) => tag.includes(clause.value)) ||
        task.subtasks.some((s) => s.title.toLowerCase().includes(clause.value))
      );
    case 'tag':
      return task.tags.includes(clause.value);
    case 'priority':
      return task.priority === clause.value;
    case 'status':
      return task.status === clause.value;
    case 'project': {
      const project = ctx.projects.find((p) => p.id === task.projectId);
      return (
        task.projectId === clause.value ||
        (project?.name.toLowerCase().includes(clause.value) ?? false)
      );
    }
    case 'is':
      return matchesFlag(task, clause.value, ctx);
    case 'due':
      return matchesDue(task, clause.value, ctx.today);
  }
}

function matchesFlag(task: Task, flag: IsFlag, ctx: QueryContext): boolean {
  switch (flag) {
    case 'overdue':
      return matchesDue(task, { kind: 'keyword', keyword: 'overdue' }, ctx.today);
    case 'blocked':
      return task.status !== 'done' && getBlockers(task, ctx.allTasks).length > 0;
    case 'open':
      return task.status !== 'done';
    case 'done':
      return task.status === 'done';
    case 'recurring':
      return task.recurrence !== null;
    case 'unscheduled':
      return task.dueDate === null;
    case 'subtasks':
      return task.subtasks.length > 0;
  }
}

export function matchesQuery(task: Task, query: ParsedQuery, ctx: QueryContext): boolean {
  return query.clauses.every((clause) => matchesClause(task, clause, ctx) !== clause.negate);
}
