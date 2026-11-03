'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/loan.controller');
const schemas = require('../validators/loan.validator');
const { idParams } = require('../validators/common');

const router = Router();

router.get('/', validate({ query: schemas.listQuery }), controller.list);
router.post('/', validate({ body: schemas.create }), controller.create);
router.put('/:id', validate({ params: idParams, body: schemas.update }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

module.exports = router;
