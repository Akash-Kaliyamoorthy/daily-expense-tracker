'use strict';

const { z } = require('zod');
const { month, money, optionalText } = require('./common');

const monthParams = z.object({ month });

const copyParams = z.object({ month, prevMonth: month }).refine((p) => p.month !== p.prevMonth, {
  message: 'Source month must be different from the target month',
  path: ['prevMonth'],
});

const fields = z.object({
  salary: money({ allowZero: true }),
  other_income: money({ allowZero: true }).default(0),
  other_income_note: optionalText(200),
  savings_goal: money({ allowZero: true }).default(0),
  savings_goal_type: z.enum(['amount', 'percent']).default('amount'),
});

// A percentage goal cannot exceed 100% of salary.
const percentCheck = (data, ctx) => {
  if (data.savings_goal_type === 'percent' && Number(data.savings_goal) > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['savings_goal'],
      message: 'A percentage goal cannot be more than 100',
    });
  }
};

/** POST /budgets/:month - salary is required, everything else has defaults. */
const create = fields.superRefine(percentCheck);

/**
 * PUT /budgets/:month - any subset of fields. The controller re-checks the
 * percent rule against the merged (stored + submitted) values.
 */
const update = fields
  .partial()
  .superRefine(percentCheck)
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

module.exports = { monthParams, copyParams, create, update };
