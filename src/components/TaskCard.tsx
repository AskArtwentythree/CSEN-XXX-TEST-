import { isOverdue } from '../store/selectors';
import type { Task } from '../types';
import { describeDue } from '../utils/date';
import { describeRecurrence } from '../utils/recurrence';
import { PriorityBadge } from './Badges';

interface TaskCardProps {
  task: Task;
  today: string;
  /** Titles of open tasks this one is waiting on. */
  blockedBy?: string[];
  onOpen: () => void;
}

export function TaskCard({ task, today, blockedBy = [], onOpen }: TaskCardProps) {
  const overdue = isOverdue(task, today);
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;
  const blocked = blockedBy.length > 0;

  return (
    <article
      className={`task-card ${task.status === 'done' ? 'is-done' : ''} ${blocked ? 'is-blocked' : ''}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Edit task: ${task.title}`}
    >
      <div className="task-card-meta">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={`due ${overdue ? 'overdue' : ''}`}>
            {overdue ? 'Overdue · ' : ''}
            {describeDue(task.dueDate, today)}
          </span>
        )}
      </div>
      <h4>{task.title}</h4>
      {(blocked || task.subtasks.length > 0 || task.recurrence) && (
        <div className="task-card-indicators">
          {blocked && (
            <span className="badge badge-blocked" title={`Waiting on: ${blockedBy.join(', ')}`}>
              Blocked
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className={`indicator ${doneSubtasks === task.subtasks.length ? 'complete' : ''}`}
              aria-label={`Checklist ${doneSubtasks} of ${task.subtasks.length} done`}
            >
              ☑ {doneSubtasks}/{task.subtasks.length}
            </span>
          )}
          {task.recurrence && (
            <span className="indicator" title={describeRecurrence(task.recurrence)}>
              ↻ {describeRecurrence(task.recurrence)}
            </span>
          )}
        </div>
      )}
      {task.tags.length > 0 && (
        <div className="tags">
          {task.tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
