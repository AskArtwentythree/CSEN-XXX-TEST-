import { NavLink, Outlet } from 'react-router';
import { useApplyTheme } from '../hooks/useApplyTheme';
import { useStore } from '../store/useStore';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects', end: true },
  { to: '/tasks', label: 'All tasks', end: false },
  { to: '/settings', label: 'Settings', end: false },
];

export function Layout() {
  const { state } = useStore();
  useApplyTheme(state.theme);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-logo" aria-hidden="true">
            ✓
          </span>
          Taskflow
        </NavLink>

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
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
