'use strict';

const { z } = require('zod');
const { hexColor, money, requiredText } = require('./common');

const limit = money({ allowZero: true });

/** POST /categories - a custom category owned by the user. */
const create = z.object({
  name: requiredText(50, 'Category name'),
  color: hexColor.default('#6366f1'),
  monthly_limit: limit.nullish().transform((value) => value ?? null),
});

/**
 * PUT /categories/:id - any subset of fields.
 *   monthly_limit: omitted = unchanged, null = remove the limit.
 * For the shared default categories only monthly_limit may change; the
 * controller enforces that.
 */
const update = z
  .object({
    name: requiredText(50, 'Category name').optional(),
    color: hexColor.optional(),
    monthly_limit: limit.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

module.exports = { create, update };
