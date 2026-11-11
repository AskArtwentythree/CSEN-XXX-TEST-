import { isOverdue } from '../store/selectors';
import type { Task } from '../types';
import { describeDue } from '../utils/date';
import { PriorityBadge } from './Badges';

interface TaskCardProps {
  task: Task;
  today: string;
  onOpen: () => void;
}

export function TaskCard({ task, today, onOpen }: TaskCardProps) {
  const overdue = isOverdue(task, today);

  return (
    <article
      className={`task-card ${task.status === 'done' ? 'is-done' : ''}`}
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
