import { forwardRef, useId } from 'react';

export const CONTROL =
  'h-11 w-full rounded-control border bg-white px-3 text-base text-ink-900 placeholder:text-ink-300 transition-colors focus:border-ink-500 disabled:opacity-60 dark:bg-ink-950 dark:text-ink-50 dark:placeholder:text-ink-500 dark:focus:border-ink-300';

/** Border colour changes when the field has an error. */
export const controlBorder = (error) =>
  error ? 'border-bad-500' : 'border-ink-200 dark:border-night-line';

/**
 * A labelled text field. The label is always visible (not just a placeholder),
 * errors are linked with aria-describedby, and the text is 16px so iPhones do
 * not zoom in when it is focused.
 *
 * `prefix` shows a fixed symbol inside the field, e.g. prefix="₹" for amounts.
 * `suffix` places a control (like a show-password button) at the right edge.
 */
const Input = forwardRef(function Input(
  { label, error, hint, prefix, suffix, className = '', id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span
            className="muted pointer-events-none absolute inset-y-0 left-3 flex items-center text-base"
            aria-hidden="true"
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} ${controlBorder(error)} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-12' : ''}`}
          {...props}
        />
        {suffix && <span className="absolute inset-y-0 right-1 flex items-center">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-bad-700 dark:text-bad-500">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="muted mt-1.5 text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
