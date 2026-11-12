import { createContext } from 'react';

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
}

export type ShowToast = (message: string, options?: ToastOptions) => void;

export const ToastContext = createContext<ShowToast | null>(null);
