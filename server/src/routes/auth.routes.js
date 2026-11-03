'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const controller = require('../controllers/auth.controller');
const schemas = require('../validators/auth.validator');

const router = Router();

router.post('/register', authLimiter, validate({ body: schemas.register }), controller.register);
router.post('/login', authLimiter, validate({ body: schemas.login }), controller.login);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
