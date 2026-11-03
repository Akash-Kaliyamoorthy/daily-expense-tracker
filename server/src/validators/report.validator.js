'use strict';

const { z } = require('zod');
const { month, isoDate } = require('./common');

/** GET /summary/:month */
const summaryParams = z.object({ month });

/** GET /reports/trend?months=6 */
const trendQuery = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

/** GET /export/csv?from=&to= (both required). */
const exportQuery = z
  .object({ from: isoDate, to: isoDate })
  .refine((query) => query.from <= query.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

module.exports = { summaryParams, trendQuery, exportQuery };
