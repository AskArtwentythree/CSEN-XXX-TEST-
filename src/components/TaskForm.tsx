import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { wouldCreateCycle } from '../store/dependencies';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_UNITS,
  STATUSES,
  STATUS_LABELS,
  type Priority,
  type Project,
  type RecurrenceFrequency,
  type Subtask,
  type Task,
  type TaskInput,
  type TaskStatus,
} from '../types';
import { createId } from '../utils/id';
import { describeRecurrence } from '../utils/recurrence';
import { parseTags } from '../utils/tags';

interface TaskFormProps {
  projects: Project[];
  /** Every task in the app, used to pick dependencies. */
  tasks?: Task[];
  initial?: Task;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
  defaultDueDate?: string;
  onSubmit: (input: TaskInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function TaskForm({
  projects,
  tasks = [],
  initial,
  defaultProjectId,
  defaultStatus,
  defaultDueDate,
  onSubmit,
  onCancel,
  onDelete,
}: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [projectId, setProjectId] = useState(
    initial?.projectId ?? defaultProjectId ?? projects[0]?.id ?? '',
  );
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? defaultStatus ?? 'todo');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? defaultDueDate ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(initial?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [dependsOn, setDependsOn] = useState<string[]>(initial?.dependsOn ?? []);
  const [frequency, setFrequency] = useState<RecurrenceFrequency | 'none'>(
    initial?.recurrence?.frequency ?? 'none',
  );
  const [repeatEvery, setRepeatEvery] = useState(String(initial?.recurrence?.interval ?? 1));
  const [error, setError] = useState<string | null>(null);

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const selfId = initial?.id;
  const pendingEdges = selfId ? new Map([[selfId, dependsOn]]) : undefined;
  const candidates = tasks.filter(
    (t) =>
      t.id !== selfId &&
      t.status !== 'done' &&
      !dependsOn.includes(t.id) &&
      !(selfId && wouldCreateCycle(tasks, selfId, t.id, pendingEdges)),
  );

  function addSubtask() {
    const value = newSubtask.trim();
    if (!value) return;
    setSubtasks((current) => [...current, { id: createId(), title: value, done: false }]);
    setNewSubtask('');
  }

  function handleSubtaskKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSubtask();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!projectId) {
      setError('Create a project first.');
      return;
    }
    const interval = Number(repeatEvery);
    if (frequency !== 'none' && !(Number.isInteger(interval) && interval >= 1)) {
      setError('Repeat interval must be a whole number of at least 1.');
      return;
    }
    if (status === 'done' && initial?.status !== 'done') {
      const blockers = dependsOn
        .map((id) => taskById.get(id))
        .filter((t): t is Task => t !== undefined && t.status !== 'done');
      if (blockers.length > 0) {
        setError(`Can't complete yet: blocked by ${blockers.map((t) => `"${t.title}"`).join(', ')}.`);
        return;
      }
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      projectId,
      status,
      priority,
      dueDate: dueDate || null,
      tags: parseTags(tags),
      subtasks,
      dependsOn,
      recurrence: frequency === 'none' ? null : { frequency, interval },
    });
  }

  const doneCount = subtasks.filter((s) => s.done).length;
  const units = frequency === 'none' ? null : RECURRENCE_UNITS[frequency];

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Title</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="What needs to be done?"
          aria-invalid={error !== null}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <label className="field">
        <span>Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details (optional)"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Project</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TaskStatus);
              setError(null);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Repeat</span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency | 'none')}
          >
            <option value="none">Does not repeat</option>
            {RECURRENCE_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {describeRecurrence({ frequency: f, interval: 1 })}
              </option>
            ))}
          </select>
        </label>
        {units && (
          <label className="field">
            <span>Every</span>
            <div className="input-with-suffix">
              <input
                type="number"
                min={1}
                step={1}
                value={repeatEvery}
                onChange={(e) => setRepeatEvery(e.target.value)}
                aria-label="Repeat interval"
              />
              <span className="muted small">{Number(repeatEvery) === 1 ? units[0] : units[1]}</span>
            </div>
          </label>
        )}
      </div>

      <label className="field">
        <span>Tags</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="design, bug, release"
        />
      </label>

      <fieldset className="field">
        <legend>
          Checklist{subtasks.length > 0 && ` · ${doneCount}/${subtasks.length}`}
        </legend>
        {subtasks.length > 0 && (
          <ul className="checklist">
            {subtasks.map((subtask) => (
              <li key={subtask.id} className={subtask.done ? 'is-done' : ''}>
                <input
                  type="checkbox"
                  checked={subtask.done}
                  aria-label={`Complete "${subtask.title}"`}
                  onChange={(e) =>
                    setSubtasks((current) =>
                      current.map((s) =>
                        s.id === subtask.id ? { ...s, done: e.target.checked } : s,
                      ),
                    )
                  }
                />
                <span className="checklist-title">{subtask.title}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove "${subtask.title}"`}
                  onClick={() =>
                    setSubtasks((current) => current.filter((s) => s.id !== subtask.id))
                  }
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="inline-add">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleSubtaskKey}
            placeholder="Add a checklist item"
            aria-label="New checklist item"
          />
          <button type="button" className="btn btn-small" onClick={addSubtask}>
            Add
          </button>
        </div>
      </fieldset>

      {tasks.length > 0 && (
        <fieldset className="field">
          <legend>Blocked by</legend>
          {dependsOn.length > 0 && (
            <ul className="chips">
              {dependsOn.map((id) => {
                const dep = taskById.get(id);
                if (!dep) return null;
                return (
                  <li key={id} className={`chip ${dep.status === 'done' ? 'is-done' : ''}`}>
                    <span className="truncate">{dep.title}</span>
                    <button
                      type="button"
                      className="chip-remove"
                      aria-label={`Remove dependency "${dep.title}"`}
                      onClick={() => {
                        setDependsOn((current) => current.filter((d) => d !== id));
                        setError(null);
                      }}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <select
            aria-label="Add dependency"
            value=""
            disabled={candidates.length === 0}
            onChange={(e) => {
              if (e.target.value) setDependsOn((current) => [...current, e.target.value]);
            }}
          >
            <option value="">
              {candidates.length ? 'Add a task this depends on…' : 'No tasks available'}
            </option>
            {projects.map((project) => {
              const options = candidates.filter((t) => t.projectId === project.id);
              if (options.length === 0) return null;
              return (
                <optgroup key={project.id} label={project.name}>
                  {options.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </fieldset>
      )}

      <footer className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
            Delete
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save changes' : 'Create task'}
        </button>
      </footer>
    </form>
  );
}
