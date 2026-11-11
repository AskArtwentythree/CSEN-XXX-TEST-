import { describe, expect, it } from 'vitest';
import { actions } from './actions';
import { reducer } from './reducer';
import { createSeedState } from './seed';

const TODAY = '2026-03-10';

describe('reducer', () => {
  it('adds a project', () => {
    const state = reducer(
      createSeedState(TODAY),
      actions.addProject({ name: 'Docs', description: '', color: '#000' }),
    );
    expect(state.projects.at(-1)).toMatchObject({ name: 'Docs', color: '#000' });
    expect(state.projects.at(-1)?.id).toBeTruthy();
  });

  it('deleting a project also deletes its tasks', () => {
    const initial = createSeedState(TODAY);
    const state = reducer(initial, actions.deleteProject('p-mobile'));
    expect(state.projects.find((p) => p.id === 'p-mobile')).toBeUndefined();
    expect(state.tasks.some((t) => t.projectId === 'p-mobile')).toBe(false);
    expect(state.tasks.length).toBeLessThan(initial.tasks.length);
  });

  it('adds, updates, moves and deletes a task', () => {
    let state = reducer(
      createSeedState(TODAY),
      actions.addTask({
        projectId: 'p-ops',
        title: 'Write runbook',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
        tags: [],
      }),
    );
    const added = state.tasks.at(-1)!;
    expect(added.title).toBe('Write runbook');

    state = reducer(state, actions.updateTask(added.id, { title: 'Write on-call runbook' }));
    expect(state.tasks.find((t) => t.id === added.id)?.title).toBe('Write on-call runbook');

    state = reducer(state, actions.moveTask(added.id, 'done'));
    expect(state.tasks.find((t) => t.id === added.id)?.status).toBe('done');

    state = reducer(state, actions.deleteTask(added.id));
    expect(state.tasks.find((t) => t.id === added.id)).toBeUndefined();
  });

  it('sets the theme', () => {
    expect(reducer(createSeedState(TODAY), actions.setTheme('dark')).theme).toBe('dark');
  });

  it('does not mutate the previous state', () => {
    const initial = createSeedState(TODAY);
    const snapshot = structuredClone(initial);
    reducer(initial, actions.deleteTask('t1'));
    expect(initial).toEqual(snapshot);
  });
});
