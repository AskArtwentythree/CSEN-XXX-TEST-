import { useState } from 'react';
import { Link } from 'react-router';
import { PriorityBadge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { TaskModal } from '../components/TaskModal';
import {
  getDashboardStats,
  getProjectProgress,
  getUpcomingTasks,
  isOverdue,
} from '../store/selectors';
import { useStore } from '../store/useStore';
import type { Task } from '../types';
import { describeDue, todayISO } from '../utils/date';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'danger' | 'success';
}

function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function DashboardPage() {
  const { state } = useStore();
  const [modal, setModal] = useState<{ task?: Task } | null>(null);
  const today = todayISO();
  const stats = getDashboardStats(state.tasks, today);
  const upcoming = getUpcomingTasks(state.tasks, today).slice(0, 6);
  const completion = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const projectById = new Map(state.projects.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting()}! Here's where things stand.`}
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

      <section className="stats-grid" aria-label="Summary">
        <StatCard label="Total tasks" value={stats.total} />
        <StatCard
          label="Completed"
          value={stats.done}
          hint={`${completion}% of all tasks`}
          tone="success"
        />
        <StatCard label="In progress" value={stats.inProgress} />
        <StatCard label="Due this week" value={stats.dueThisWeek} />
        <StatCard label="Overdue" value={stats.overdue} tone={stats.overdue ? 'danger' : 'default'} />
        <StatCard label="Blocked" value={stats.blocked} hint="Waiting on other tasks" />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <header className="panel-header">
            <h2>Project progress</h2>
            <Link to="/projects" className="link">
              View all
            </Link>
          </header>
          {state.projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              action={
                <Link to="/projects" className="btn btn-primary">
                  Create a project
                </Link>
              }
            />
          ) : (
            <ul className="progress-list">
              {state.projects.map((project) => {
                const progress = getProjectProgress(state.tasks, project.id);
                return (
                  <li key={project.id}>
                    <Link to={`/projects/${project.id}`} className="progress-row">
                      <span className="progress-title">
                        <span className="dot" style={{ background: project.color }} />
                        {project.name}
                      </span>
                      <span className="muted small">
                        {progress.done}/{progress.total} · {progress.percent}%
                      </span>
                    </Link>
                    <ProgressBar
                      percent={progress.percent}
                      color={project.color}
                      label={`${project.name} progress`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <header className="panel-header">
            <h2>Upcoming &amp; overdue</h2>
            <Link to="/tasks?sort=dueDate" className="link">
              All tasks
            </Link>
          </header>
          {upcoming.length === 0 ? (
            <EmptyState title="You're all caught up" description="Nothing due in the next 7 days." />
          ) : (
            <ul className="upcoming-list">
              {upcoming.map((task) => {
                const project = projectById.get(task.projectId);
                return (
                  <li key={task.id}>
                    <button className="upcoming-item" onClick={() => setModal({ task })}>
                      <span className="dot" style={{ background: project?.color }} />
                      <span className="upcoming-title truncate">{task.title}</span>
                      <PriorityBadge priority={task.priority} />
                      <span className={`due ${isOverdue(task, today) ? 'overdue' : ''}`}>
                        {task.dueDate && describeDue(task.dueDate, today)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} />}
    </>
  );
}
