'use strict';

const { z } = require('zod');
const { id, month, money, requiredText, dueDay } = require('./common');

const fields = {
  name: requiredText(100, 'Name'),
  amount: money(),
  category_id: id.nullish().transform((value) => value ?? null),
  due_day: dueDay,
};

/** GET /fixed-expenses?month=YYYY-MM */
const listQuery = z.object({ month });

/** POST /fixed-expenses */
const create = z.object({ month, ...fields });

/** PUT /fixed-expenses/:id */
const update = z.object(fields);

module.exports = { listQuery, create, update };
