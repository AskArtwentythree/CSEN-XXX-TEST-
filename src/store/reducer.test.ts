import { describe, expect, it } from 'vitest';
import { actions, getDeletionSnapshot } from './actions';
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
        subtasks: [],
        dependsOn: [],
        recurrence: null,
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

  it('spawns the next instance when a recurring task is completed', () => {
    const initial = createSeedState(TODAY);
    const action = actions.moveTask('t11', 'done');
    const state = reducer(initial, action);
    const original = state.tasks.find((t) => t.id === 't11')!;
    const next = state.tasks.find((t) => t.id === (action as { spawnId: string }).spawnId)!;

    expect(original.status).toBe('done');
    expect(original.recurrence).toBeNull();
    expect(next).toMatchObject({
      title: 'Clean up old staging servers',
      status: 'todo',
      recurrence: { frequency: 'monthly', interval: 1 },
    });
    expect(next.dueDate! > original.dueDate!).toBe(true);
    expect(state.tasks).toHaveLength(initial.tasks.length + 1);

    // Re-opening and completing again must not create another copy.
    let again = reducer(state, actions.moveTask('t11', 'todo'));
    again = reducer(again, actions.moveTask('t11', 'done'));
    expect(again.tasks).toHaveLength(state.tasks.length);
  });

  it('resets the checklist on the next recurring instance', () => {
    const initial = createSeedState(TODAY);
    let state = reducer(
      initial,
      actions.updateTask('t10', {
        recurrence: { frequency: 'weekly', interval: 1 },
        subtasks: [{ id: 'a', title: 'Generate', done: true }],
      }),
    );
    state = reducer(state, actions.moveTask('t10', 'done'));
    expect(state.tasks.at(-1)?.subtasks).toEqual([{ id: 'a', title: 'Generate', done: false }]);
  });

  it('refuses to complete a blocked task but keeps other edits', () => {
    const state = reducer(
      createSeedState(TODAY),
      actions.updateTask('t8', { status: 'done', title: 'Store screenshots' }),
    );
    expect(state.tasks.find((t) => t.id === 't8')).toMatchObject({
      status: 'todo',
      title: 'Store screenshots',
    });
  });

  it('drops dependency edges that would create a cycle', () => {
    // t8 depends on t5, so t5 can't depend on t8.
    const state = reducer(createSeedState(TODAY), actions.updateTask('t5', { dependsOn: ['t8', 't7'] }));
    expect(state.tasks.find((t) => t.id === 't5')?.dependsOn).toEqual(['t7']);
  });

  it('removes dangling dependencies when tasks or projects are deleted', () => {
    const initial = createSeedState(TODAY);
    expect(reducer(initial, actions.deleteTask('t5')).tasks.find((t) => t.id === 't8')?.dependsOn).toEqual([]);

    const crossProject = reducer(initial, actions.updateTask('t10', { dependsOn: ['t2'] }));
    const state = reducer(crossProject, actions.deleteProject('p-website'));
    expect(state.tasks.find((t) => t.id === 't10')?.dependsOn).toEqual([]);
  });

  it('restores a deleted project with its tasks and incoming dependencies', () => {
    const initial = reducer(createSeedState(TODAY), actions.updateTask('t10', { dependsOn: ['t5'] }));
    const snapshot = getDeletionSnapshot(initial, { projectId: 'p-mobile' });
    expect(snapshot.links).toEqual([['t10', 't5']]);

    let state = reducer(initial, actions.deleteProject('p-mobile'));
    state = reducer(state, actions.updateTask('t1', { title: 'Unrelated edit' }));
    state = reducer(state, actions.restore(snapshot));

    expect(state.projects.map((p) => p.id)).toContain('p-mobile');
    expect(state.tasks.filter((t) => t.projectId === 'p-mobile')).toHaveLength(4);
    expect(state.tasks.find((t) => t.id === 't8')?.dependsOn).toEqual(['t5']);
    expect(state.tasks.find((t) => t.id === 't10')?.dependsOn).toEqual(['t5']);
    expect(state.tasks.find((t) => t.id === 't1')?.title).toBe('Unrelated edit');
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
