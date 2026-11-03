'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/expense.controller');
const schemas = require('../validators/expense.validator');
const { idParams } = require('../validators/common');

/** /api/expenses */
const expenses = Router();
expenses.get('/', validate({ query: schemas.listQuery }), controller.list);
expenses.post('/', validate({ body: schemas.create }), controller.create);
expenses.get('/:id', validate({ params: idParams }), controller.get);
expenses.put('/:id', validate({ params: idParams, body: schemas.update }), controller.update);
expenses.delete('/:id', validate({ params: idParams }), controller.remove);

/** /api/recurring - manage the rules that auto-create expenses. */
const recurring = Router();
recurring.get('/', controller.listRecurring);
recurring.patch(
  '/:id',
  validate({ params: idParams, body: schemas.recurringUpdate }),
  controller.updateRecurring,
);
recurring.delete('/:id', validate({ params: idParams }), controller.removeRecurring);

module.exports = { expenses, recurring };
