import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { ProjectModal } from '../components/ProjectModal';
import { useTaskActions } from '../hooks/useTaskActions';
import { getProjectProgress } from '../store/selectors';
import { useStore } from '../store/useStore';
import type { Project } from '../types';

export function ProjectsPage() {
  const { state } = useStore();
  const { deleteProject } = useTaskActions();
  const [modal, setModal] = useState<{ project?: Project } | null>(null);

  function handleDelete(project: Project) {
    const count = state.tasks.filter((t) => t.projectId === project.id).length;
    const message = count
      ? `Delete "${project.name}" and its ${count} task${count === 1 ? '' : 's'}?`
      : `Delete "${project.name}"?`;
    if (window.confirm(message)) deleteProject(project);
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${state.projects.length} project${state.projects.length === 1 ? '' : 's'}`}
        actions={
          <button className="btn btn-primary" onClick={() => setModal({})}>
            + New project
          </button>
        }
      />

      {state.projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Projects group related tasks together. Create one to get started."
          action={
            <button className="btn btn-primary" onClick={() => setModal({})}>
              Create your first project
            </button>
          }
        />
      ) : (
        <div className="project-grid">
          {state.projects.map((project) => {
            const progress = getProjectProgress(state.tasks, project.id);
            return (
              <article key={project.id} className="project-card">
                <div className="project-card-accent" style={{ background: project.color }} />
                <Link to={`/projects/${project.id}`} className="project-card-body">
                  <h2>{project.name}</h2>
                  <p className="muted">{project.description || 'No description'}</p>
                  <div className="project-card-stats">
                    <span>
                      {progress.total} task{progress.total === 1 ? '' : 's'}
                    </span>
                    <span>{progress.percent}% done</span>
                  </div>
                  <ProgressBar
                    percent={progress.percent}
                    color={project.color}
                    label={`${project.name} progress`}
                  />
                </Link>
                <footer className="project-card-actions">
                  <button className="btn btn-small" onClick={() => setModal({ project })}>
                    Edit
                  </button>
                  <button
                    className="btn btn-small btn-danger-ghost"
                    onClick={() => handleDelete(project)}
                  >
                    Delete
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {modal && <ProjectModal project={modal.project} onClose={() => setModal(null)} />}
    </>
  );
}
