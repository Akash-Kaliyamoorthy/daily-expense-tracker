'use strict';

/**
 * Reusable zod building blocks shared by all validators.
 * Request/response JSON uses snake_case field names (matching the DB columns).
 */
const { z } = require('zod');
const { parsePaiseStrict, fromPaise, MAX_PAISE } = require('../utils/money');
const { isValidMonth, isValidDate } = require('../utils/dates');

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking'];
const FREQUENCIES = ['daily', 'weekly', 'monthly'];

/** A positive integer id (accepts "12" from URLs and 12 from JSON). */
const id = z.coerce.number().int().positive();
const idParams = z.object({ id });

/** 'YYYY-MM' */
const month = z.string().refine(isValidMonth, 'Month must be in YYYY-MM format');

/** A real calendar date, 'YYYY-MM-DD'. */
const isoDate = z.string().refine(isValidDate, 'Date must be a valid date (YYYY-MM-DD)');

/**
 * Money field. Accepts a number or numeric string with at most 2 decimals and
 * outputs a canonical 2-decimal STRING ("1250.50") that goes straight into a
 * NUMERIC column. Never uses floats.
 */
function money({ allowZero = false } = {}) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    const paise = parsePaiseStrict(value);
    if (paise === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid amount (up to 2 decimal places)',
      });
      return z.NEVER;
    }
    if (paise > MAX_PAISE) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is too large' });
      return z.NEVER;
    }
    if (!allowZero && paise === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount must be greater than zero' });
      return z.NEVER;
    }
    return fromPaise(paise);
  });
}

/** Optional trimmed text; empty / missing -> null. */
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value ? value : null));

/** Required trimmed, non-empty text. */
const requiredText = (max, label = 'This field') =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

/** Optional integer in a range; '' / null / undefined -> null. */
const optionalInt = (min, max) =>
  z.preprocess(
    (value) => (value === '' ? null : value),
    z.coerce.number().int().min(min).max(max).nullish(),
  );

/** Day of month, 1-31. */
const dueDay = z.coerce
  .number({ invalid_type_error: 'Due day must be a number' })
  .int('Due day must be a whole number')
  .min(1, 'Due day must be between 1 and 31')
  .max(31, 'Due day must be between 1 and 31');

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must look like #1a2b3c');

const paymentMethod = z.enum(PAYMENT_METHODS, {
  errorMap: () => ({ message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}` }),
});

/** Query-string helper: '' behaves like "not provided". */
const qs = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

module.exports = {
  PAYMENT_METHODS,
  FREQUENCIES,
  id,
  idParams,
  month,
  isoDate,
  money,
  optionalText,
  requiredText,
  optionalInt,
  dueDay,
  hexColor,
  paymentMethod,
  qs,
};
