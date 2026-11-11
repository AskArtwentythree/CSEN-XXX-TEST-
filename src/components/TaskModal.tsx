import { actions } from '../store/actions';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus } from '../types';
import { Modal } from './Modal';
import { TaskForm } from './TaskForm';

interface TaskModalProps {
  task?: Task;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
  onClose: () => void;
}

export function TaskModal({ task, defaultProjectId, defaultStatus, onClose }: TaskModalProps) {
  const { state, dispatch } = useStore();

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <TaskForm
        projects={state.projects}
        initial={task}
        defaultProjectId={defaultProjectId}
        defaultStatus={defaultStatus}
        onCancel={onClose}
        onSubmit={(input) => {
          dispatch(task ? actions.updateTask(task.id, input) : actions.addTask(input));
          onClose();
        }}
        onDelete={
          task
            ? () => {
                if (window.confirm(`Delete "${task.title}"?`)) {
                  dispatch(actions.deleteTask(task.id));
                  onClose();
                }
              }
            : undefined
        }
      />
    </Modal>
  );
}
