import { useEffect, useId, useRef } from 'react';
import Icon from './Icon';

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: a bottom sheet on phones, a centred panel on larger
 * screens. Esc and a click on the backdrop close it, Tab stays inside it,
 * the page behind does not scroll, and focus returns to the trigger on close.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    // Focus the first form field rather than the close button.
    const first = [...panel.querySelectorAll(FOCUSABLE)].find((el) => !el.dataset.modalClose);
    (first || panel).focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`panel flex max-h-[92vh] w-full flex-col rounded-b-none rounded-t-sheet shadow-sheet sm:rounded-sheet ${SIZES[size]}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-dashed border-ink-200 px-5 py-4 dark:border-night-line">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            data-modal-close="true"
            onClick={onClose}
            className="muted rounded-control p-2 hover:bg-ink-100 dark:hover:bg-ink-900"
            aria-label="Close dialog"
          >
            <Icon name="x" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="pb-safe flex flex-col-reverse gap-2 border-t border-dashed border-ink-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-night-line">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
