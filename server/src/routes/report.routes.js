'use strict';

const { Router } = require('express');
const validate = require('../middleware/validate');
const summary = require('../controllers/summary.controller');
const reports = require('../controllers/report.controller');
const schemas = require('../validators/report.validator');

const router = Router();

router.get('/summary/:month', validate({ params: schemas.summaryParams }), summary.getSummary);
router.get('/reports/trend', validate({ query: schemas.trendQuery }), reports.trend);
router.get('/export/csv', validate({ query: schemas.exportQuery }), reports.exportCsv);

module.exports = router;
