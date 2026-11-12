import { useContext } from 'react';
import { ToastContext, type ShowToast } from './context';

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used within <ToastProvider>');
  return show;
}
