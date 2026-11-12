import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createSeedState } from './store/seed';
import { StoreProvider } from './store/StoreProvider';
import { ToastProvider } from './toast/ToastProvider';
import { formatDate, formatMonth, todayISO } from './utils/date';

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider initialState={createSeedState(todayISO())}>
        <ToastProvider>
          <App />
        </ToastProvider>
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

  it('filters with the search language', async () => {
    renderApp('/tasks?q=is%3Ablocked');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText('App Store screenshots')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Blocked')).toBeInTheDocument();
  });

  it('explains invalid search terms', () => {
    renderApp('/tasks?q=priority%3Aurgent');
    expect(screen.getByText('Unknown priority value "urgent"')).toBeInTheDocument();
  });

  it('will not complete a blocked task and says why', async () => {
    const user = userEvent.setup();
    renderApp('/tasks?q=screenshots');

    const checkbox = screen.getByRole('checkbox', { name: 'Mark "App Store screenshots" as done' });
    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(/is blocked by "Implement login screen"/)).toBeInTheDocument();
  });

  it('schedules the next occurrence when a recurring task is completed', async () => {
    const user = userEvent.setup();
    renderApp('/tasks?q=staging');

    await user.click(screen.getByRole('checkbox', { name: 'Mark "Clean up old staging servers" as done' }));

    const checkboxes = screen.getAllByRole('checkbox', { name: /Clean up old staging servers/ });
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes.filter((c) => (c as HTMLInputElement).checked)).toHaveLength(1);
    expect(screen.getByText(/Next "Clean up old staging servers" scheduled/)).toBeInTheDocument();
  });

  it('adds checklist items and a dependency from the task form', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p-ops');

    await user.click(screen.getByRole('button', { name: 'Edit task: Rotate API keys' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    await user.type(within(dialog).getByLabelText('New checklist item'), 'Generate keys{Enter}');
    await user.type(within(dialog).getByLabelText('New checklist item'), 'Deploy{Enter}');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Complete "Generate keys"' }));
    await user.selectOptions(within(dialog).getByLabelText('Add dependency'), 't7');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    const card = screen.getByRole('button', { name: 'Edit task: Rotate API keys' });
    expect(within(card).getByLabelText('Checklist 1 of 2 done')).toBeInTheDocument();
    expect(within(card).getByText('Blocked')).toBeInTheDocument();
  });

  it('does not offer dependencies that would create a cycle', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p-mobile');

    await user.click(screen.getByRole('button', { name: 'Edit task: Implement login screen' }));
    const select = within(screen.getByRole('dialog')).getByLabelText('Add dependency');
    const options = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(options).not.toContain('App Store screenshots');
    expect(options).toContain('Fix crash on Android 12');
  });

  it('undoes a task deletion from the toast', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p-ops');

    await user.click(screen.getByRole('button', { name: 'Edit task: Rotate API keys' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByText('Rotate API keys')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Rotate API keys')).toBeInTheDocument();
  });

  it('supports undo and redo keyboard shortcuts', async () => {
    const user = userEvent.setup();
    renderApp('/tasks?q=rotate');

    await user.click(screen.getByRole('checkbox', { name: 'Mark "Rotate API keys" as done' }));
    await user.click(document.body);
    await user.keyboard('{Control>}z{/Control}');
    expect(screen.getByRole('checkbox', { name: 'Mark "Rotate API keys" as done' })).not.toBeChecked();

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(screen.getByRole('checkbox', { name: 'Mark "Rotate API keys" as done' })).toBeChecked();
  });

  it('opens the command palette and jumps to a project', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.keyboard('{Control>}k{/Control}');
    const palette = screen.getByRole('dialog', { name: 'Command palette' });
    await user.type(within(palette).getByRole('combobox'), 'mobapp');
    expect(within(palette).getAllByRole('option')[0]).toHaveTextContent('Mobile App');
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Mobile App' })).toBeInTheDocument();
  });

  it('opens a task from the command palette', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('button', { name: /Search or jump to/ }));
    await user.type(screen.getByRole('combobox'), 'android crash');
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Fix crash on Android 12');
  });

  it('shows tasks on the calendar and creates one for a specific day', async () => {
    const user = userEvent.setup();
    const today = todayISO();
    renderApp(`/calendar?month=${today.slice(0, 7)}`);

    const day = screen.getByRole('region', { name: formatDate(today) });
    expect(within(day).getByText('Rotate API keys')).toBeInTheDocument();
    const unscheduled = screen.getByRole('complementary', { name: 'Unscheduled' });
    expect(within(unscheduled).getByText('Set up analytics events')).toBeInTheDocument();

    await user.click(within(day).getByRole('button', { name: `Add task on ${formatDate(today)}` }));
    const dialog = screen.getByRole('dialog', { name: 'New task' });
    expect(within(dialog).getByLabelText('Due date')).toHaveValue(today);
    await user.type(within(dialog).getByLabelText('Title'), 'Calendar task');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));
    expect(within(day).getByText('Calendar task')).toBeInTheDocument();
  });

  it('navigates calendar months via the URL', async () => {
    const user = userEvent.setup();
    renderApp('/calendar?month=2026-01');
    expect(screen.getByRole('heading', { level: 2, name: formatMonth('2026-01') })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { level: 2, name: formatMonth('2026-02') })).toBeInTheDocument();
  });
});
