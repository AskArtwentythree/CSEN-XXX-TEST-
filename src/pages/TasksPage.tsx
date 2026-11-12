import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { TaskModal } from '../components/TaskModal';
import { useTaskActions } from '../hooks/useTaskActions';
import { getBlockers } from '../store/dependencies';
import {
  SORT_KEYS,
  SORT_LABELS,
  filterTasks,
  isOverdue,
  sortTasks,
  type SortKey,
  type TaskFilters,
} from '../store/selectors';
import { useStore } from '../store/useStore';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Priority,
  type Task,
  type TaskStatus,
} from '../types';
import { describeDue, todayISO } from '../utils/date';
import { oneOf } from '../utils/params';
import { parseQuery } from '../utils/query';
import { describeRecurrence } from '../utils/recurrence';

const QUERY_EXAMPLES = ['is:overdue', 'is:blocked', 'priority:high', 'due:<7d', '-is:done', '#bug'];

export function TasksPage() {
  const { state } = useStore();
  const { setStatus } = useTaskActions();
  const [params, setParams] = useSearchParams();
  const [modal, setModal] = useState<{ task?: Task } | null>(null);
  const today = todayISO();

  const projectIds = state.projects.map((p) => p.id);
  const filters: TaskFilters = {
    query: params.get('q') ?? '',
    status: oneOf<TaskStatus | 'all'>(params.get('status'), [...STATUSES, 'all'], 'all'),
    priority: oneOf<Priority | 'all'>(params.get('priority'), [...PRIORITIES, 'all'], 'all'),
    projectId: oneOf(params.get('project'), [...projectIds, 'all'], 'all'),
  };
  const sort = oneOf<SortKey>(params.get('sort'), SORT_KEYS, 'dueDate');
  const hasFilters =
    filters.query !== '' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.projectId !== 'all';

  const visible = sortTasks(
    filterTasks(state.tasks, filters, { today, projects: state.projects }),
    sort,
  );
  const queryErrors = parseQuery(filters.query).errors;
  const projectById = new Map(state.projects.map((p) => [p.id, p]));

  function setParam(key: string, value: string, defaultValue = 'all') {
    const next = new URLSearchParams(params);
    if (value === '' || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="All tasks"
        subtitle={`Showing ${visible.length} of ${state.tasks.length} tasks`}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setModal({})}
            disabled={state.projects.length === 0}
          >
            + New task
          </button>
        }
      />

      <div className="toolbar" role="search">
        <input
          type="search"
          className="toolbar-search"
          placeholder="Search, or filter with is:overdue priority:high #tag due:<7d"
          aria-describedby="search-help"
          aria-label="Search tasks"
          value={filters.query}
          onChange={(e) => setParam('q', e.target.value, '')}
        />
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => setParam('status', e.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          value={filters.priority}
          onChange={(e) => setParam('priority', e.target.value)}
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by project"
          value={filters.projectId}
          onChange={(e) => setParam('project', e.target.value)}
        >
          <option value="all">All projects</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort by"
          value={sort}
          onChange={(e) => setParam('sort', e.target.value, 'dueDate')}
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              Sort: {SORT_LABELS[key]}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            className="btn btn-ghost"
            onClick={() => setParams(sort === 'dueDate' ? {} : { sort }, { replace: true })}
          >
            Clear filters
          </button>
        )}
      </div>

      <p id="search-help" className={`search-help small ${queryErrors.length ? 'has-error' : ''}`}>
        {queryErrors.length > 0 ? (
          queryErrors.join(' · ')
        ) : (
          <>
            Try{' '}
            {QUERY_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="query-chip"
                onClick={() =>
                  setParam('q', [filters.query.trim(), example].filter(Boolean).join(' '), '')
                }
              >
                {example}
              </button>
            ))}
          </>
        )}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No matching tasks' : 'No tasks yet'}
          description={hasFilters ? 'Try adjusting your search or filters.' : undefined}
        />
      ) : (
        <div className="table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th className="col-check">
                  <span className="sr-only">Done</span>
                </th>
                <th>Task</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((task) => {
                const project = projectById.get(task.projectId);
                return (
                  <tr
                    key={task.id}
                    className={task.status === 'done' ? 'is-done' : ''}
                    onClick={() => setModal({ task })}
                  >
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Mark "${task.title}" as done`}
                        checked={task.status === 'done'}
                        onChange={(e) => setStatus(task, e.target.checked ? 'done' : 'todo')}
                      />
                    </td>
                    <td>
                      <span className="task-title">{task.title}</span>
                      {task.status !== 'done' && getBlockers(task, state.tasks).length > 0 && (
                        <span className="badge badge-blocked inline-badge">Blocked</span>
                      )}
                      {task.subtasks.length > 0 && (
                        <span className="indicator inline-badge">
                          ☑ {task.subtasks.filter((st) => st.done).length}/{task.subtasks.length}
                        </span>
                      )}
                      {task.recurrence && (
                        <span
                          className="indicator inline-badge"
                          title={describeRecurrence(task.recurrence)}
                          aria-label={describeRecurrence(task.recurrence)}
                        >
                          ↻
                        </span>
                      )}
                      {task.tags.length > 0 && (
                        <span className="tags inline">
                          {task.tags.map((tag) => (
                            <span key={tag} className="tag">
                              #{tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="project-cell">
                        <span className="dot" style={{ background: project?.color }} />
                        {project?.name ?? 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={task.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className={isOverdue(task, today) ? 'due overdue' : 'due'}>
                      {task.dueDate ? describeDue(task.dueDate, today) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} />}
    </>
  );
}
