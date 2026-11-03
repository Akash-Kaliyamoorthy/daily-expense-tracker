'use strict';

const { z } = require('zod');
const { FREQUENCIES, id, isoDate, money, optionalText, paymentMethod, qs } = require('./common');

const SORTS = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];

const categoryRef = id.nullish().transform((value) => value ?? null);

/**
 * POST /expenses
 * expense_date defaults to "today" (in the app timezone) in the controller.
 * recurring_frequency, if given, also creates a recurring rule that repeats
 * this expense (daily / weekly / monthly).
 */
const create = z.object({
  amount: money(),
  expense_date: isoDate.optional(),
  category_id: categoryRef,
  payment_method: paymentMethod.default('UPI'),
  note: optionalText(255),
  recurring_frequency: z
    .enum(FREQUENCIES)
    .nullish()
    .transform((value) => value ?? null),
});

/** PUT /expenses/:id */
const update = z.object({
  amount: money(),
  expense_date: isoDate,
  category_id: categoryRef,
  payment_method: paymentMethod,
  note: optionalText(255),
});

/** GET /expenses?from&to&category&method&q&page&limit&sort */
const listQuery = z
  .object({
    from: qs(isoDate),
    to: qs(isoDate),
    category: qs(z.string().regex(/^(\d+|none)$/, 'Category must be an id or "none"')),
    method: qs(paymentMethod),
    q: qs(z.string().trim().max(100)),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: qs(z.enum(SORTS)).transform((value) => value ?? 'date_desc'),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

/** PATCH /recurring/:id - pause or resume a rule. */
const recurringUpdate = z.object({ active: z.boolean({ required_error: 'active is required' }) });

module.exports = { SORTS, create, update, listQuery, recurringUpdate };
