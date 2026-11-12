import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createSeedState } from '../store/seed';
import { TaskForm } from './TaskForm';

const { projects, tasks } = createSeedState('2026-03-10');

describe('TaskForm', () => {
  it('requires a title', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TaskForm projects={projects} onSubmit={onSubmit} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Title is required.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalised input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskForm
        projects={projects}
        defaultProjectId="p-ops"
        defaultStatus="in_progress"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText('Title'), '  Backup database  ');
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.type(screen.getByLabelText('Tags'), 'Infra, #ops');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Backup database',
      description: '',
      projectId: 'p-ops',
      status: 'in_progress',
      priority: 'high',
      dueDate: null,
      tags: ['infra', 'ops'],
      subtasks: [],
      dependsOn: [],
      recurrence: null,
    });
  });

  it('pre-fills when editing and offers delete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TaskForm
        projects={projects}
        initial={tasks[1]}
        onSubmit={() => {}}
        onCancel={() => {}}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByLabelText('Title')).toHaveValue(tasks[1].title);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
  });
});
