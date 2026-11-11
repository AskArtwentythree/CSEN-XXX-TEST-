import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createSeedState } from './store/seed';
import { StoreProvider } from './store/StoreProvider';
import { todayISO } from './utils/date';

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider initialState={createSeedState(todayISO())}>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('renders the dashboard with summary stats', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Total tasks').nextSibling).toHaveTextContent('11');
  });

  it('navigates between pages from the sidebar', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    await user.click(within(nav).getByRole('link', { name: 'All tasks' }));
    expect(screen.getByRole('heading', { level: 1, name: 'All tasks' })).toBeInTheDocument();
  });

  it('creates a project', async () => {
    const user = userEvent.setup();
    renderApp('/projects');

    await user.click(screen.getByRole('button', { name: '+ New project' }));
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    await user.type(within(dialog).getByLabelText('Name'), 'Marketing');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Marketing' })).toBeInTheDocument();
  });

  it('adds a task to a project board column', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p-ops');

    await user.click(screen.getByRole('button', { name: 'Add task to In progress' }));
    const dialog = screen.getByRole('dialog', { name: 'New task' });
    await user.type(within(dialog).getByLabelText('Title'), 'Upgrade database');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    const column = screen.getByRole('region', { name: 'In progress' });
    expect(within(column).getByText('Upgrade database')).toBeInTheDocument();
  });

  it('filters tasks via search and syncs to the URL state', async () => {
    const user = userEvent.setup();
    renderApp('/tasks');

    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'login');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2); // header + 1 match
    expect(screen.getByText('Implement login screen')).toBeInTheDocument();
  });

  it('marks a task done from the task list', async () => {
    const user = userEvent.setup();
    renderApp('/tasks?q=rotate');

    const checkbox = screen.getByRole('checkbox', { name: 'Mark "Rotate API keys" as done' });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('deletes a project after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/projects/p-ops');

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Operations' })).not.toBeInTheDocument();
  });

  it('switches theme in settings', async () => {
    const user = userEvent.setup();
    renderApp('/settings');
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('shows a 404 page for unknown routes', () => {
    renderApp('/nope');
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});
