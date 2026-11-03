'use strict';

/**
 * All /api routes. Everything except /auth/* requires a logged-in user, and
 * every query is scoped to req.user.id so users only ever see their own data.
 */
const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const authRoutes = require('./auth.routes');
const budgetRoutes = require('./budget.routes');
const loanRoutes = require('./loan.routes');
const fixedExpenseRoutes = require('./fixedExpense.routes');
const { expenses, recurring } = require('./expense.routes');
const categoryRoutes = require('./category.routes');
const reportRoutes = require('./report.routes');

const router = Router();

// Public (auth.routes protects /me itself)
router.use('/auth', authRoutes);

// Everything below needs a valid session
router.use(requireAuth);
router.use('/budgets', budgetRoutes);
router.use('/loans', loanRoutes);
router.use('/fixed-expenses', fixedExpenseRoutes);
router.use('/expenses', expenses);
router.use('/recurring', recurring);
router.use('/categories', categoryRoutes);
router.use('/', reportRoutes); // /summary/:month, /reports/trend, /export/csv

module.exports = router;
