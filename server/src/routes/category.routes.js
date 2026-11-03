'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/category.controller');
const schemas = require('../validators/category.validator');
const { idParams } = require('../validators/common');

const router = Router();

router.get('/', controller.list);
router.post('/', validate({ body: schemas.create }), controller.create);
router.put('/:id', validate({ params: idParams, body: schemas.update }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

module.exports = router;
