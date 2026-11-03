'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/budget.controller');
const schemas = require('../validators/budget.validator');

const router = Router();

router.get('/:month', validate({ params: schemas.monthParams }), controller.get);
router.post(
  '/:month',
  validate({ params: schemas.monthParams, body: schemas.create }),
  controller.create,
);
router.put(
  '/:month',
  validate({ params: schemas.monthParams, body: schemas.update }),
  controller.update,
);
router.post(
  '/:month/copy-from/:prevMonth',
  validate({ params: schemas.copyParams }),
  controller.copyFromPrevious,
);

module.exports = router;
