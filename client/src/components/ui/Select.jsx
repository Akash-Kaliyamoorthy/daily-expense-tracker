import { forwardRef, useId } from 'react';
import { CONTROL, controlBorder } from './Input';

/** A labelled dropdown. Pass <option> elements as children. */
const Select = forwardRef(function Select(
  { label, error, hint, className = '', id, children, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id || autoId;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL} ${controlBorder(error)} pr-8`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={`${selectId}-error`} className="mt-1.5 text-sm text-bad-700 dark:text-bad-500">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="muted mt-1.5 text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
