import { useState, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { ProjectModal } from '../components/ProjectModal';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { actions } from '../store/actions';
import { getProjectProgress, sortTasks } from '../store/selectors';
import { useStore } from '../store/useStore';
import { STATUSES, STATUS_LABELS, type Task, type TaskStatus } from '../types';
import { todayISO } from '../utils/date';
import { NotFoundPage } from './NotFoundPage';

type BoardModal =
  | { kind: 'task'; task?: Task; status?: TaskStatus }
  | { kind: 'project' }
  | null;

export function ProjectBoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const [modal, setModal] = useState<BoardModal>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return <NotFoundPage message="This project doesn't exist or was deleted." />;

  const today = todayISO();
  const tasks = sortTasks(
    state.tasks.filter((t) => t.projectId === project.id),
    'priority',
  );
  const progress = getProjectProgress(state.tasks, project.id);

  function handleDrop(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    setDragOver(null);
    const taskId = event.dataTransfer.getData('text/plain');
    const task = state.tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) dispatch(actions.moveTask(task.id, status));
  }

  function handleDeleteProject() {
    if (!project) return;
    if (window.confirm(`Delete "${project.name}" and all of its tasks?`)) {
      dispatch(actions.deleteProject(project.id));
      navigate('/projects');
    }
  }

  return (
    <>
      <PageHeader
        title={
          <span className="title-with-dot">
            <span className="dot dot-large" style={{ background: project.color }} />
            {project.name}
          </span>
        }
        subtitle={project.description}
        actions={
          <>
            <button className="btn" onClick={() => setModal({ kind: 'project' })}>
              Edit project
            </button>
            <button className="btn btn-danger-ghost" onClick={handleDeleteProject}>
              Delete
            </button>
            <button className="btn btn-primary" onClick={() => setModal({ kind: 'task' })}>
              + New task
            </button>
          </>
        }
      />

      <div className="board-progress">
        <ProgressBar percent={progress.percent} color={project.color} label="Project progress" />
        <span className="muted small">
          {progress.done} of {progress.total} tasks done
        </span>
      </div>

      <div className="board">
        {STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <section
              key={status}
              className={`column ${dragOver === status ? 'drag-over' : ''}`}
              aria-label={STATUS_LABELS[status]}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOver(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragOver(null);
                }
              }}
              onDrop={(event) => handleDrop(event, status)}
            >
              <header className="column-header">
                <h3>
                  <span className={`status-dot status-${status}`} />
                  {STATUS_LABELS[status]}
                  <span className="count">{columnTasks.length}</span>
                </h3>
                <button
                  className="icon-button"
                  aria-label={`Add task to ${STATUS_LABELS[status]}`}
                  onClick={() => setModal({ kind: 'task', status })}
                >
                  +
                </button>
              </header>
              <div className="column-body">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    today={today}
                    onOpen={() => setModal({ kind: 'task', task })}
                  />
                ))}
                {columnTasks.length === 0 && <p className="column-empty">Drop tasks here</p>}
              </div>
            </section>
          );
        })}
      </div>

      {modal?.kind === 'task' && (
        <TaskModal
          task={modal.task}
          defaultProjectId={project.id}
          defaultStatus={modal.status}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'project' && (
        <ProjectModal project={project} onClose={() => setModal(null)} />
      )}
    </>
  );
}
