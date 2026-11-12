import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext, type ToastOptions } from './context';

const DURATION_MS = 6000;
const MAX_VISIBLE = 3;

interface Toast extends ToastOptions {
  id: number;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, ...options }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.tone ?? 'default'}`}>
              <span>{toast.message}</span>
              {toast.actionLabel && toast.onAction && (
                <button
                  className="btn btn-small toast-action"
                  onClick={() => {
                    toast.onAction?.();
                    dismiss(toast.id);
                  }}
                >
                  {toast.actionLabel}
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
