import { actions, getDeletionSnapshot } from '../store/actions';
import { getBlockers } from '../store/dependencies';
import { useStore } from '../store/useStore';
import { useToast } from '../toast/useToast';
import type { Project, Task, TaskStatus } from '../types';
import { describeDue, todayISO } from '../utils/date';
import { nextOccurrence } from '../utils/recurrence';

export function useTaskActions() {
  const { state, dispatch } = useStore();
  const toast = useToast();

  /** Returns false (and explains why) if the change isn't allowed. */
  function setStatus(task: Task, status: TaskStatus): boolean {
    if (task.status === status) return true;
    if (status === 'done') {
      const blockers = getBlockers(task, state.tasks);
      if (blockers.length > 0) {
        toast(`"${task.title}" is blocked by ${blockers.map((t) => `"${t.title}"`).join(', ')}`, {
          tone: 'error',
        });
        return false;
      }
    }
    dispatch(actions.moveTask(task.id, status));
    if (status === 'done' && task.recurrence) {
      const today = todayISO();
      const next = nextOccurrence(task.dueDate, task.recurrence, today);
      toast(`Next "${task.title}" scheduled for ${describeDue(next, today)}`);
    }
    return true;
  }

  function deleteProject(project: Project) {
    const snapshot = getDeletionSnapshot(state, { projectId: project.id });
    dispatch(actions.deleteProject(project.id));
    toast(`Deleted "${project.name}"`, {
      actionLabel: 'Undo',
      onAction: () => dispatch(actions.restore(snapshot)),
    });
  }

  return { setStatus, deleteProject };
}
