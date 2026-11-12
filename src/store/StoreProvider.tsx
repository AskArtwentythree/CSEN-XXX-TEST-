import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { AppState } from '../types';
import { StoreContext } from './context';
import { createHistory, historyReducer } from './history';
import { loadState, saveState } from './storage';

interface StoreProviderProps {
  children: ReactNode;
  initialState?: AppState;
}

export function StoreProvider({ children, initialState }: StoreProviderProps) {
  const [history, dispatch] = useReducer(historyReducer, initialState, (init) =>
    createHistory(init ?? loadState()),
  );
  const state = history.present;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const value = useMemo(
    () => ({ state, dispatch, canUndo, canRedo }),
    [state, canUndo, canRedo],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
