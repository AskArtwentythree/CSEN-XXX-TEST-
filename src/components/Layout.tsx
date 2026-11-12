import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useApplyTheme } from '../hooks/useApplyTheme';
import { actions } from '../store/actions';
import { useStore } from '../store/useStore';
import { useToast } from '../toast/useToast';
import type { Task } from '../types';
import { isEditableTarget, isModKey, shortcutLabel } from '../utils/keys';
import { CommandPalette } from './CommandPalette';
import { ProjectModal } from './ProjectModal';
import { TaskModal } from './TaskModal';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects', end: true },
  { to: '/tasks', label: 'All tasks', end: false },
  { to: '/calendar', label: 'Calendar', end: false },
  { to: '/settings', label: 'Settings', end: false },
];

type GlobalModal = { kind: 'task'; task?: Task } | { kind: 'project' } | null;

export function Layout() {
  const { state, dispatch, canUndo, canRedo } = useStore();
  const toast = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modal, setModal] = useState<GlobalModal>(null);
  useApplyTheme(state.theme);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isModKey(event)) return;
      const key = event.key.toLowerCase();
      const dialogOpen = document.querySelector('[aria-modal="true"]') !== null;

      if (key === 'k') {
        event.preventDefault();
        if (!dialogOpen || paletteOpen) setPaletteOpen((open) => !open);
        return;
      }
      if (dialogOpen || isEditableTarget(event.target)) return;

      const redo = (key === 'z' && event.shiftKey) || key === 'y';
      if (redo && canRedo) {
        event.preventDefault();
        dispatch(actions.redo());
        toast('Redone');
      } else if (key === 'z' && !event.shiftKey && canUndo) {
        event.preventDefault();
        dispatch(actions.undo());
        toast('Undone', { actionLabel: 'Redo', onAction: () => dispatch(actions.redo()) });
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [canUndo, canRedo, dispatch, paletteOpen, toast]);

  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openTask = useCallback((task?: Task) => setModal({ kind: 'task', task }), []);
  const newProject = useCallback(() => setModal({ kind: 'project' }), []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-logo" aria-hidden="true">
            ✓
          </span>
          Taskflow
        </NavLink>

        <button className="palette-trigger" onClick={() => setPaletteOpen(true)}>
          <span>Search or jump to…</span>
          <kbd>{shortcutLabel('K')}</kbd>
        </button>

        <nav className="nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>

        {state.projects.length > 0 && (
          <nav className="sidebar-projects" aria-label="Projects">
            <h3>Projects</h3>
            {state.projects.map((project) => (
              <NavLink key={project.id} to={`/projects/${project.id}`} className="nav-link">
                <span className="dot" style={{ background: project.color }} />
                <span className="truncate">{project.name}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="history-controls">
          <button
            className="btn btn-small"
            onClick={() => dispatch(actions.undo())}
            disabled={!canUndo}
            title={`Undo (${shortcutLabel('Z')})`}
          >
            ↶ Undo
          </button>
          <button
            className="btn btn-small"
            onClick={() => dispatch(actions.redo())}
            disabled={!canRedo}
            title={`Redo (${shortcutLabel('Z', { shift: true })})`}
          >
            ↷ Redo
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      {paletteOpen && (
        <CommandPalette onClose={closePalette} onOpenTask={openTask} onNewProject={newProject} />
      )}
      {modal?.kind === 'task' && <TaskModal task={modal.task} onClose={() => setModal(null)} />}
      {modal?.kind === 'project' && <ProjectModal onClose={() => setModal(null)} />}
    </div>
  );
}
