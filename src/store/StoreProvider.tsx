import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { AppState } from '../types';
import { StoreContext } from './context';
import { reducer } from './reducer';
import { loadState, saveState } from './storage';

interface StoreProviderProps {
  children: ReactNode;
  initialState?: AppState;
}

export function StoreProvider({ children, initialState }: StoreProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => init ?? loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
