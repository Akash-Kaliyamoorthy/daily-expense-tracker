/**
 * Form validation shared by every form. These mirror the server rules
 * (validators/common.js): money has at most 2 decimals, due days are 1-31.
 * The server re-checks everything, so these exist to give instant feedback.
 */

/** Pasted "1,25,000" works: commas are dropped before sending. */
export const cleanAmount = (value) =>
  String(value ?? '')
    .trim()
    .replace(/,/g, '');

/** Returns an error message, or '' when the amount is fine. */
export function amountError(value, { allowZero = false, label = 'an amount' } = {}) {
  const v = cleanAmount(value);
  if (!v) return `Enter ${label}`;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(v)) return 'Enter a valid amount, with up to 2 decimal places';
  if (!allowZero && Number(v) === 0) return 'The amount must be more than zero';
  return '';
}

/** Optional amount: empty is fine. */
export function optionalAmountError(value, options) {
  return cleanAmount(value) === '' ? '' : amountError(value, options);
}

export function dueDayError(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'Enter a day of the month';
  if (!/^\d{1,2}$/.test(v) || Number(v) < 1 || Number(v) > 31) return 'Enter a day from 1 to 31';
  return '';
}

export function requiredError(value, label) {
  return String(value ?? '').trim() ? '' : `Enter ${label}`;
}

/** Drop empty entries so `Object.keys(errors).length === 0` means "valid". */
export const compactErrors = (errors) =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
