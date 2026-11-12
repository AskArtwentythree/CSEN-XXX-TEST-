import { actions, getDeletionSnapshot } from '../store/actions';
import { useStore } from '../store/useStore';
import { useToast } from '../toast/useToast';
import type { Task, TaskStatus } from '../types';
import { describeDue, todayISO } from '../utils/date';
import { nextOccurrence } from '../utils/recurrence';
import { Modal } from './Modal';
import { TaskForm } from './TaskForm';

interface TaskModalProps {
  task?: Task;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
  defaultDueDate?: string;
  onClose: () => void;
}

export function TaskModal({
  task,
  defaultProjectId,
  defaultStatus,
  defaultDueDate,
  onClose,
}: TaskModalProps) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <TaskForm
        projects={state.projects}
        tasks={state.tasks}
        initial={task}
        defaultProjectId={defaultProjectId}
        defaultStatus={defaultStatus}
        defaultDueDate={defaultDueDate}
        onCancel={onClose}
        onSubmit={(input) => {
          dispatch(task ? actions.updateTask(task.id, input) : actions.addTask(input));
          if (task && input.status === 'done' && task.status !== 'done' && input.recurrence) {
            const today = todayISO();
            const next = nextOccurrence(input.dueDate, input.recurrence, today);
            toast(`Next "${input.title}" scheduled for ${describeDue(next, today)}`);
          }
          onClose();
        }}
        onDelete={
          task
            ? () => {
                const snapshot = getDeletionSnapshot(state, { taskId: task.id });
                dispatch(actions.deleteTask(task.id));
                toast(`Deleted "${task.title}"`, {
                  actionLabel: 'Undo',
                  onAction: () => dispatch(actions.restore(snapshot)),
                });
                onClose();
              }
            : undefined
        }
      />
    </Modal>
  );
}
