import { createContext, type Dispatch } from 'react';
import type { AppState } from '../types';
import type { Action } from './actions';

export interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  canUndo: boolean;
  canRedo: boolean;
}

export const StoreContext = createContext<StoreValue | null>(null);
