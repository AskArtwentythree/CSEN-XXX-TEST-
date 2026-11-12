import { describe, expect, it } from 'vitest';
import { actions } from './actions';
import { HISTORY_LIMIT, createHistory, historyReducer } from './history';
import { createSeedState } from './seed';

const TODAY = '2026-03-10';

describe('historyReducer', () => {
  it('undoes and redoes changes', () => {
    let h = createHistory(createSeedState(TODAY));
    h = historyReducer(h, actions.deleteTask('t1'));
    expect(h.present.tasks.some((t) => t.id === 't1')).toBe(false);

    h = historyReducer(h, actions.undo());
    expect(h.present.tasks.some((t) => t.id === 't1')).toBe(true);
    expect(h.future).toHaveLength(1);

    h = historyReducer(h, actions.redo());
    expect(h.present.tasks.some((t) => t.id === 't1')).toBe(false);
  });

  it('clears the redo stack on a new change', () => {
    let h = createHistory(createSeedState(TODAY));
    h = historyReducer(h, actions.deleteTask('t1'));
    h = historyReducer(h, actions.undo());
    h = historyReducer(h, actions.deleteTask('t2'));
    expect(h.future).toEqual([]);
  });

  it('does not record theme changes and keeps the theme across undo', () => {
    let h = createHistory(createSeedState(TODAY));
    h = historyReducer(h, actions.deleteTask('t1'));
    h = historyReducer(h, actions.setTheme('dark'));
    expect(h.past).toHaveLength(1);

    h = historyReducer(h, actions.undo());
    expect(h.present.theme).toBe('dark');
    expect(h.present.tasks.some((t) => t.id === 't1')).toBe(true);
  });

  it('ignores no-op actions and empty stacks', () => {
    const h = createHistory(createSeedState(TODAY));
    expect(historyReducer(h, actions.deleteTask('missing'))).toBe(h);
    expect(historyReducer(h, actions.undo())).toBe(h);
    expect(historyReducer(h, actions.redo())).toBe(h);
  });

  it(`keeps at most ${HISTORY_LIMIT} entries`, () => {
    let h = createHistory(createSeedState(TODAY));
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      h = historyReducer(h, actions.updateTask('t1', { title: `Title ${i}` }));
    }
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });
});
