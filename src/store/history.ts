import type { AppState } from '../types';
import type { Action } from './actions';
import { reducer } from './reducer';

export const HISTORY_LIMIT = 100;

export interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

export function createHistory(present: AppState): HistoryState {
  return { past: [], present, future: [] };
}

/**
 * Wraps the app reducer with undo/redo. Theme is a preference rather than
 * data, so it is never recorded and is preserved when stepping through history.
 */
export function historyReducer(history: HistoryState, action: Action): HistoryState {
  const { past, present, future } = history;

  switch (action.type) {
    case 'history/undo': {
      if (past.length === 0) return history;
      const previous = past[past.length - 1];
      return {
        past: past.slice(0, -1),
        present: { ...previous, theme: present.theme },
        future: [present, ...future],
      };
    }
    case 'history/redo': {
      if (future.length === 0) return history;
      const [next, ...rest] = future;
      return {
        past: [...past, present],
        present: { ...next, theme: present.theme },
        future: rest,
      };
    }
    case 'theme/set':
      return { ...history, present: reducer(present, action) };
    default: {
      const next = reducer(present, action);
      if (next === present) return history;
      return {
        past: [...past, present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    }
  }
}
