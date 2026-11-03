'use strict';

const { z } = require('zod');
const { month, money, optionalText, optionalInt, requiredText, dueDay } = require('./common');

const fields = {
  name: requiredText(100, 'Loan name'),
  emi_amount: money(),
  due_day: dueDay,
  remaining_months: optionalInt(0, 600),
  lender: optionalText(100),
};

/** GET /loans?month=YYYY-MM */
const listQuery = z.object({ month });

/** POST /loans - the loan is attached to that month's budget. */
const create = z.object({ month, ...fields });

/** PUT /loans/:id - the month a loan belongs to cannot change. */
const update = z.object(fields);

module.exports = { listQuery, create, update };
