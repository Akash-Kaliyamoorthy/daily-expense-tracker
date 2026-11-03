import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Icon from '../components/ui/Icon';

const ToastContext = createContext(null);

const TOAST_MS = 4500;

const STYLES = {
  success: { icon: 'check', bar: 'bg-ok-500', text: 'text-ok-700 dark:text-ok-500' },
  error: { icon: 'alert', bar: 'bg-bad-500', text: 'text-bad-700 dark:text-bad-500' },
  info: { icon: 'info', bar: 'bg-ink-500', text: 'text-ink-600 dark:text-ink-300' },
};

/** Toast notifications: `const toast = useToast(); toast.success('Saved')`. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = nextId.current++;
      // Keep at most 4 on screen; the oldest makes way for the newest.
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), type === 'error' ? TOAST_MS + 2500 : TOAST_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const api = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live: screen readers announce each toast as it appears. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-stretch gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="panel pointer-events-auto flex items-start gap-3 overflow-hidden py-3 pl-0 pr-2 shadow-sheet"
            >
              <span
                className={`mt-[-12px] mb-[-12px] w-1 self-stretch ${s.bar}`}
                aria-hidden="true"
              />
              <Icon name={s.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${s.text}`} />
              <p className="flex-1 text-sm leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="muted rounded-control p-1 hover:bg-ink-100 dark:hover:bg-ink-900"
                aria-label="Dismiss notification"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
