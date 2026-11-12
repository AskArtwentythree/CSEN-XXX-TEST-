import { useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { TaskModal } from '../components/TaskModal';
import { actions } from '../store/actions';
import { isOverdue } from '../store/selectors';
import { useStore } from '../store/useStore';
import type { Task } from '../types';
import {
  ISO_MONTH_RE,
  addMonths,
  formatDate,
  formatMonth,
  getMonthGrid,
  parseISODate,
  todayISO,
} from '../utils/date';
import { describeRecurrence, occurrencesBetween } from '../utils/recurrence';

const MAX_PER_DAY = 3;
const UNSCHEDULED = 'unscheduled';

interface Entry {
  task: Task;
  /** A projected future occurrence of a recurring task, not a real task yet. */
  projected: boolean;
}

function shiftMonth(month: string, delta: number): string {
  return addMonths(`${month}-01`, delta).slice(0, 7);
}

export function CalendarPage() {
  const { state, dispatch } = useStore();
  const [params, setParams] = useSearchParams();
  const [modal, setModal] = useState<{ task?: Task; dueDate?: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const today = todayISO();
  const monthParam = params.get('month') ?? '';
  const month = ISO_MONTH_RE.test(monthParam) ? monthParam : today.slice(0, 7);
  const projectParam = params.get('project');
  const projectId = state.projects.some((p) => p.id === projectParam) ? projectParam : null;

  const days = getMonthGrid(month);
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const projectById = new Map(state.projects.map((p) => [p.id, p]));
  const tasks = state.tasks.filter((t) => projectId === null || t.projectId === projectId);

  const byDate = new Map<string, Entry[]>();
  const push = (date: string, entry: Entry) =>
    byDate.set(date, [...(byDate.get(date) ?? []), entry]);
  for (const task of tasks) {
    if (task.dueDate === null) continue;
    if (task.dueDate >= rangeStart && task.dueDate <= rangeEnd) push(task.dueDate, { task, projected: false });
    if (task.recurrence && task.status !== 'done') {
      for (const date of occurrencesBetween(task.dueDate, task.recurrence, rangeStart, rangeEnd)) {
        push(date, { task, projected: true });
      }
    }
  }
  const unscheduled = tasks.filter((t) => t.dueDate === null && t.status !== 'done');

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  function dropProps(target: string) {
    return {
      onDragOver: (event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOver(target);
      },
      onDragLeave: (event: DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(null);
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        setDragOver(null);
        const task = state.tasks.find((t) => t.id === event.dataTransfer.getData('text/plain'));
        const dueDate = target === UNSCHEDULED ? null : target;
        if (task && task.dueDate !== dueDate) dispatch(actions.updateTask(task.id, { dueDate }));
      },
    };
  }

  function renderEntry({ task, projected }: Entry, date: string) {
    const color = projectById.get(task.projectId)?.color;
    const className = [
      'calendar-task',
      task.status === 'done' ? 'is-done' : '',
      projected ? 'is-projected' : '',
      !projected && isOverdue(task, today) ? 'is-overdue' : '',
    ].join(' ');
    return (
      <li key={`${task.id}-${projected ? date : 'actual'}`}>
        <button
          type="button"
          className={className}
          draggable={!projected}
          onDragStart={(event) => {
            event.dataTransfer.setData('text/plain', task.id);
            event.dataTransfer.effectAllowed = 'move';
          }}
          onClick={() => setModal({ task })}
          title={projected ? `Repeats: ${describeRecurrence(task.recurrence!)}` : task.title}
        >
          <span className="dot" style={{ background: color }} />
          <span className="truncate">{task.title}</span>
          {projected && <span className="sr-only">(upcoming repeat)</span>}
        </button>
      </li>
    );
  }

  const weekdays = days.slice(0, 7).map((d) =>
    parseISODate(d).toLocaleDateString(undefined, { weekday: 'short' }),
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Drag tasks between days to reschedule. Dashed items are upcoming repeats."
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

      <div className="toolbar calendar-toolbar">
        <div className="button-row">
          <button
            className="btn"
            aria-label="Previous month"
            onClick={() => setParam('month', shiftMonth(month, -1))}
          >
            ‹
          </button>
          <button className="btn" onClick={() => setParam('month', null)}>
            Today
          </button>
          <button
            className="btn"
            aria-label="Next month"
            onClick={() => setParam('month', shiftMonth(month, 1))}
          >
            ›
          </button>
        </div>
        <h2 className="calendar-title" aria-live="polite">
          {formatMonth(month)}
        </h2>
        <span className="spacer" />
        <select
          aria-label="Filter calendar by project"
          value={projectId ?? 'all'}
          onChange={(e) => setParam('project', e.target.value === 'all' ? null : e.target.value)}
        >
          <option value="all">All projects</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="calendar-layout">
        <div className="calendar">
          {weekdays.map((name) => (
            <div key={name} className="calendar-weekday" aria-hidden="true">
              {name}
            </div>
          ))}
          {days.map((date) => {
            const entries = byDate.get(date) ?? [];
            const isExpanded = expanded === date;
            const shown = isExpanded ? entries : entries.slice(0, MAX_PER_DAY);
            const hidden = entries.length - shown.length;
            const classes = [
              'calendar-day',
              date.slice(0, 7) !== month ? 'is-outside' : '',
              date === today ? 'is-today' : '',
              dragOver === date ? 'drag-over' : '',
            ].join(' ');
            return (
              <section key={date} className={classes} aria-label={formatDate(date)} {...dropProps(date)}>
                <header className="calendar-day-header">
                  <span className="calendar-date">{Number(date.slice(8))}</span>
                  <button
                    type="button"
                    className="icon-button calendar-add"
                    aria-label={`Add task on ${formatDate(date)}`}
                    onClick={() => setModal({ dueDate: date })}
                    disabled={state.projects.length === 0}
                  >
                    +
                  </button>
                </header>
                <ul className="calendar-tasks">
                  {shown.map((entry) => renderEntry(entry, date))}
                </ul>
                {(hidden > 0 || isExpanded) && entries.length > MAX_PER_DAY && (
                  <button
                    type="button"
                    className="calendar-more"
                    onClick={() => setExpanded(isExpanded ? null : date)}
                  >
                    {isExpanded ? 'Show less' : `+${hidden} more`}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        <aside
          className={`panel calendar-unscheduled ${dragOver === UNSCHEDULED ? 'drag-over' : ''}`}
          aria-label="Unscheduled"
          {...dropProps(UNSCHEDULED)}
        >
          <h2>Unscheduled</h2>
          <p className="muted small">Drag onto a day to schedule, or back here to clear the date.</p>
          {unscheduled.length === 0 ? (
            <p className="muted small calendar-empty">Every open task has a date.</p>
          ) : (
            <ul className="calendar-tasks">
              {unscheduled.map((task) => renderEntry({ task, projected: false }, UNSCHEDULED))}
            </ul>
          )}
        </aside>
      </div>

      {modal && (
        <TaskModal
          task={modal.task}
          defaultDueDate={modal.dueDate}
          defaultProjectId={projectId ?? undefined}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
