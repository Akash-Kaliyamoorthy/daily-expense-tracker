const env = require('../src/config/env');
const { todayISO, currentMonth } = require('../src/utils/dates');
const { resetDb, registerAgent, categoryId, closePool, app, request } = require('./helpers');

// 2025-02 is a fully past, 28-day month, so these numbers never change with the clock.
const PAST = '2025-02';
const NEXT = '2025-03';

let agent;
let foodId;
let groceriesId;

beforeAll(async () => {
  await resetDb();
  ({ agent } = await registerAgent('summary@example.com'));
  foodId = await categoryId(agent, 'Food');
  groceriesId = await categoryId(agent, 'Groceries');
});
afterAll(closePool);

const spend = (amount, date, category_id = foodId) =>
  agent.post('/api/expenses').send({ amount, expense_date: date, category_id });
const summary = async (month) => (await agent.get(`/api/summary/${month}`)).body.data;

describe('monthly budget setup', () => {
  test('creates a budget and computes commitments, disposable amount and daily budget', async () => {
    const created = await agent
      .post(`/api/budgets/${PAST}`)
      .send({ salary: 125000, savings_goal: 10000, other_income_note: null });
    expect(created.status).toBe(201);

    await agent.post('/api/loans').send({
      month: PAST,
      name: 'Home loan',
      emi_amount: 20000,
      due_day: 5,
      remaining_months: 120,
      lender: 'SBI',
    });
    await agent
      .post('/api/loans')
      .send({ month: PAST, name: 'Phone EMI', emi_amount: 5000, due_day: 10, remaining_months: 1 });
    await agent
      .post('/api/loans')
      .send({ month: PAST, name: 'Chit fund', emi_amount: 1000, due_day: 28 });
    await agent
      .post('/api/fixed-expenses')
      .send({ month: PAST, name: 'Rent', amount: 30000, due_day: 1 });

    const setup = (await agent.get(`/api/budgets/${PAST}`)).body.data;
    expect(setup.exists).toBe(true);
    expect(setup.loans.map((l) => l.name)).toEqual(['Home loan', 'Phone EMI', 'Chit fund']); // by due day
    expect(setup.totals).toMatchObject({
      loans_total: 26000,
      fixed_total: 30000,
      total_commitments: 56000,
      total_income: 125000,
      disposable: 59000, // 125000 - 56000 - 10000
      days_in_month: 28,
      is_over_committed: false,
    });
    expect(setup.totals.daily_budget).toBe(2107.14); // 59000 / 28
  });

  test('rejects a duplicate month, an unknown month on update and a bad month format', async () => {
    expect((await agent.post(`/api/budgets/${PAST}`).send({ salary: 1 })).status).toBe(409);
    expect((await agent.put('/api/budgets/2031-01').send({ salary: 1 })).status).toBe(404);
    expect((await agent.get('/api/budgets/2026-13')).status).toBe(400);
    expect((await agent.get('/api/budgets/november')).status).toBe(400);
  });

  test('updates income fields and validates the merged percent rule', async () => {
    const up = await agent
      .put(`/api/budgets/${PAST}`)
      .send({ other_income: 5000, other_income_note: 'Bonus' });
    expect(up.status).toBe(200);
    expect(up.body.data).toMatchObject({
      salary: 125000,
      other_income: 5000,
      other_income_note: 'Bonus',
    });
    expect(up.body.data.totals.disposable).toBe(64000);

    // Stored goal is 10000; switching only the type to percent would mean 10000%.
    expect(
      (await agent.put(`/api/budgets/${PAST}`).send({ savings_goal_type: 'percent' })).status,
    ).toBe(400);
    const pct = await agent
      .put(`/api/budgets/${PAST}`)
      .send({ savings_goal: 20, savings_goal_type: 'percent' });
    expect(pct.status).toBe(200);
    expect(pct.body.data.totals.savings_goal_amount).toBe(25000); // 20% of the 125000 salary
    expect((await agent.put(`/api/budgets/${PAST}`).send({})).status).toBe(400);

    // restore for the summary tests below
    await agent.put(`/api/budgets/${PAST}`).send({
      other_income: 0,
      other_income_note: null,
      savings_goal: 10000,
      savings_goal_type: 'amount',
    });
  });

  test('a salary of zero is allowed and an empty month still returns a valid setup', async () => {
    const zero = await agent.post('/api/budgets/2025-08').send({ salary: 0 });
    expect(zero.status).toBe(201);
    expect(zero.body.data.totals).toMatchObject({ disposable: 0, daily_budget: 0 });

    const empty = (await agent.get('/api/budgets/2031-05')).body.data;
    expect(empty).toMatchObject({ exists: false, salary: 0, loans: [], fixed_expenses: [] });
  });

  test('knows February has 29 days in a leap year', async () => {
    const leap = (await agent.get('/api/budgets/2028-02')).body.data;
    expect(leap.totals.days_in_month).toBe(29);
    expect((await agent.get('/api/budgets/2026-12')).body.data.totals.days_in_month).toBe(31);
  });

  test('flags commitments that exceed income instead of hiding the shortfall', async () => {
    await agent.post('/api/budgets/2025-09').send({ salary: 20000 });
    await agent
      .post('/api/fixed-expenses')
      .send({ month: '2025-09', name: 'Rent', amount: 25000, due_day: 1 });
    const setup = (await agent.get('/api/budgets/2025-09')).body.data;
    expect(setup.totals.disposable).toBe(-5000);
    expect(setup.totals.is_over_committed).toBe(true);
    expect(setup.totals.daily_budget).toBe(0);
    const s = await summary('2025-09');
    expect(s.warnings.map((w) => w.code)).toContain('OVER_COMMITTED');
    expect(s.remaining_balance).toBe(-5000);
  });

  test('loans and fixed expenses can be edited and deleted; ownership and ranges are enforced', async () => {
    const { body } = await agent
      .post('/api/loans')
      .send({ month: '2025-10', name: 'Bike', emi_amount: 3000, due_day: 12 });
    const loanId = body.data.id;
    const edited = await agent.put(`/api/loans/${loanId}`).send({
      name: 'Bike loan',
      emi_amount: '3250.50',
      due_day: 15,
      remaining_months: 8,
      lender: 'HDFC',
    });
    expect(edited.body.data).toMatchObject({
      name: 'Bike loan',
      emi_amount: 3250.5,
      due_day: 15,
      remaining_months: 8,
    });
    expect(
      (
        await agent
          .post('/api/loans')
          .send({ month: '2025-10', name: 'Bad', emi_amount: 100, due_day: 32 })
      ).status,
    ).toBe(400);
    expect(
      (
        await agent
          .post('/api/loans')
          .send({ month: '2025-10', name: 'Bad', emi_amount: 0, due_day: 5 })
      ).status,
    ).toBe(400);

    const stranger = (await registerAgent('intruder@example.com')).agent;
    expect(
      (await stranger.put(`/api/loans/${loanId}`).send({ name: 'x', emi_amount: 1, due_day: 1 }))
        .status,
    ).toBe(404);
    expect((await stranger.delete(`/api/loans/${loanId}`)).status).toBe(404);

    expect((await agent.delete(`/api/loans/${loanId}`)).status).toBe(200);
    expect((await agent.get('/api/loans?month=2025-10')).body.data.items).toEqual([]);
  });
});

describe('copy from last month', () => {
  test('copies salary, savings goal, fixed expenses and loans; ended loans are dropped', async () => {
    const res = await agent.post(`/api/budgets/${NEXT}/copy-from/${PAST}`);
    expect(res.status).toBe(201);
    const data = res.body.data;

    expect(data.copied).toEqual({ loans: 2, fixed_expenses: 1, skipped_loans: 1 });
    expect(data).toMatchObject({ salary: 125000, savings_goal: 10000, other_income: 0 });
    const byName = Object.fromEntries(data.loans.map((l) => [l.name, l]));
    expect(byName['Home loan'].remaining_months).toBe(119); // one EMI paid
    expect(byName['Chit fund'].remaining_months).toBeNull(); // open-ended stays open-ended
    expect(byName['Phone EMI']).toBeUndefined(); // was on its last month
    expect(data.fixed_expenses.map((f) => f.name)).toEqual(['Rent']);
  });

  test('does not duplicate when the target month is already set up, and 404s without a source', async () => {
    expect((await agent.post(`/api/budgets/${NEXT}/copy-from/${PAST}`)).status).toBe(409);
    expect((await agent.post('/api/budgets/2025-05/copy-from/2019-01')).status).toBe(404);
    expect((await agent.post(`/api/budgets/${PAST}/copy-from/${PAST}`)).status).toBe(400);
    // the original month is unchanged
    expect((await agent.get(`/api/budgets/${PAST}`)).body.data.loans).toHaveLength(3);
  });
});

describe('GET /api/summary/:month', () => {
  test('a month with no spending: full budget available, green, no warnings', async () => {
    const s = await summary(PAST);
    expect(s).toMatchObject({
      month: PAST,
      month_state: 'past',
      has_budget: true,
      days_in_month: 28,
      total_commitments: 56000,
      disposable: 59000,
      spent: 0,
      remaining_disposable: 59000,
      remaining_balance: 69000,
      budget_status: 'green',
      warnings: [],
    });
    expect(s.daily).toHaveLength(28);
    expect(s.highest_day).toBeNull();
    expect(s.categories).toEqual([]);
  });

  test('aggregates spending: totals, categories, daily series, highest day, top five', async () => {
    await spend(1500, '2025-02-03', foodId);
    await spend(500, '2025-02-03', foodId);
    await spend(9000, '2025-02-10', groceriesId);
    await spend(1000, '2025-02-20', null);
    for (const [i, name] of ['Fuel', 'Health', 'Travel', 'Shopping'].entries()) {
      await spend(100 + i, '2025-02-21', await categoryId(agent, name));
    }

    const s = await summary(PAST);
    expect(s.spent).toBe(12406); // 2000 + 9000 + 1000 + (100+101+102+103)
    expect(s.expense_count).toBe(8);
    expect(s.remaining_disposable).toBe(46594);
    expect(s.remaining_balance).toBe(56594);
    expect(s.used_pct).toBe(21);
    expect(s.budget_status).toBe('green');
    expect(s.savings_progress_pct).toBe(100);

    expect(s.categories[0]).toMatchObject({ name: 'Groceries', spent: 9000, count: 1 });
    expect(s.categories[0].share_pct).toBe(72.5); // 9000 / 12406
    expect(s.categories.find((c) => c.name === 'Food')).toMatchObject({ spent: 2000, count: 2 });
    expect(s.categories.find((c) => c.name === 'Other').spent).toBe(1000); // uncategorised
    expect(s.top_categories).toHaveLength(5);

    expect(s.highest_day).toEqual({ date: '2025-02-10', total: 9000 });
    expect(s.daily[2]).toEqual({ date: '2025-02-03', day: 3, total: 2000 });
    expect(s.daily.reduce((sum, d) => sum + d.total, 0)).toBe(12406);
    expect(s.overview).toMatchObject({
      income: 125000,
      commitments: 56000,
      variable_spending: 12406,
      total_outflow: 68406,
    });
  });

  test('colour and warnings change as spending crosses 70%, 80% and 100%', async () => {
    await spend(30000, '2025-02-25'); // total 42406 = 71.9% -> amber, no banner yet
    let s = await summary(PAST);
    expect(s.budget_status).toBe('amber');
    expect(s.warnings).toEqual([]);

    await spend(6000, '2025-02-26'); // 48406 = 82.0% -> 80% banner
    s = await summary(PAST);
    expect(s.warnings.map((w) => w.code)).toEqual(['MONTH_80']);
    expect(s.warnings[0].message).toContain('82%');

    await spend(12000, '2025-02-27'); // 60406 > 59000 -> exceeded
    s = await summary(PAST);
    expect(s.budget_status).toBe('red');
    expect(s.warnings.map((w) => w.code)).toEqual(['MONTH_EXCEEDED']);
    expect(s.remaining_disposable).toBe(-1406);
    expect(s.savings_progress_pct).toBeGreaterThanOrEqual(0);
  });

  test('a future month gets the full daily budget and no "today" numbers', async () => {
    await agent.post('/api/budgets/2099-01').send({ salary: 31000 });
    const s = await summary('2099-01');
    expect(s).toMatchObject({
      month_state: 'future',
      days_left: 31,
      daily_budget: 1000,
      remaining_daily_budget: 1000,
    });
  });

  test('current month: spending today is tracked, and with no budget the user is nudged', async () => {
    const month = currentMonth(env.timezone);
    const today = todayISO(env.timezone);
    await spend(450, today);
    const s = await summary(month);
    expect(s).toMatchObject({ month_state: 'current', has_budget: false, spent_today: 450, today });
    expect(s.warnings.map((w) => w.code)).toEqual(['NO_INCOME']);
    expect(s.days_left).toBeGreaterThanOrEqual(1);
  });

  test("current month: today's budget is exceeded and EMIs falling due this week are listed", async () => {
    const month = currentMonth(env.timezone);
    const today = todayISO(env.timezone);
    const dayOfMonth = Number(today.slice(8, 10));

    // Salary 31000 and no commitments -> a budget of roughly 1000/day, then overspend today.
    await agent.post(`/api/budgets/${month}`).send({ salary: 31000 });
    await agent
      .post('/api/loans')
      .send({ month, name: 'Due today EMI', emi_amount: 1, due_day: dayOfMonth });
    await agent
      .post('/api/fixed-expenses')
      .send({ month, name: 'Far away bill', amount: 1, due_day: ((dayOfMonth + 14 - 1) % 28) + 1 });
    await spend(25000, today);

    const s = await summary(month);
    expect(s.warnings.map((w) => w.code)).toContain('TODAY_EXCEEDED');
    expect(s.spent_today).toBe(25450);
    const due = s.upcoming_dues.find((d) => d.name === 'Due today EMI');
    expect(due).toMatchObject({ type: 'loan', amount: 1, due_date: today, days_away: 0 });
    expect(s.upcoming_dues.find((d) => d.name === 'Far away bill')).toBeUndefined();
    // Viewing another month never shows dues.
    expect((await summary(PAST)).upcoming_dues).toEqual([]);
  });

  test('per-category limits raise an alert once exceeded and can be removed', async () => {
    await agent.put(`/api/categories/${groceriesId}`).send({ monthly_limit: 8000 });
    let s = await summary(PAST);
    const groceries = s.category_limits.find((c) => c.name === 'Groceries');
    expect(groceries).toMatchObject({ spent: 9000, monthly_limit: 8000, limit_status: 'exceeded' });
    expect(s.warnings.some((w) => w.code === 'CATEGORY_LIMIT_EXCEEDED')).toBe(true);

    await agent.put(`/api/categories/${groceriesId}`).send({ monthly_limit: 20000 });
    s = await summary(PAST);
    expect(s.category_limits.find((c) => c.name === 'Groceries').limit_status).toBe('ok');

    await agent.put(`/api/categories/${groceriesId}`).send({ monthly_limit: 9500 });
    s = await summary(PAST);
    expect(s.category_limits.find((c) => c.name === 'Groceries').limit_status).toBe('near'); // 94.7%

    // A limit on a category with no spending still appears so the user can see it.
    const health = await categoryId(agent, 'Education');
    await agent.put(`/api/categories/${health}`).send({ monthly_limit: 3000 });
    s = await summary(PAST);
    expect(s.category_limits.find((c) => c.name === 'Education')).toMatchObject({
      spent: 0,
      limit_status: 'ok',
    });

    await agent.put(`/api/categories/${groceriesId}`).send({ monthly_limit: null });
    await agent.put(`/api/categories/${health}`).send({ monthly_limit: null });
    expect((await summary(PAST)).category_limits).toEqual([]);
  });

  test("never mixes in another user's data", async () => {
    const stranger = (await registerAgent('lonely@example.com')).agent;
    const s = (await stranger.get(`/api/summary/${PAST}`)).body.data;
    expect(s).toMatchObject({ has_budget: false, spent: 0, expense_count: 0, categories: [] });
  });

  test('validates the month and requires login', async () => {
    expect((await agent.get('/api/summary/2026-00')).status).toBe(400);
    expect((await request(app).get(`/api/summary/${PAST}`)).status).toBe(401);
  });
});

describe('GET /api/reports/trend', () => {
  test('returns the last N months oldest-first with spending and status', async () => {
    const res = await agent.get('/api/reports/trend?months=3');
    expect(res.status).toBe(200);
    const { items } = res.body.data;
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.month)).toEqual([...items.map((i) => i.month)].sort());
    expect(items[2].month).toBe(currentMonth(env.timezone));
    expect(items[2].spent).toBeGreaterThanOrEqual(25450);
  });

  test('defaults to 6 months and rejects out-of-range values', async () => {
    expect((await agent.get('/api/reports/trend')).body.data.items).toHaveLength(6);
    expect((await agent.get('/api/reports/trend?months=99')).status).toBe(400);
    expect((await agent.get('/api/reports/trend?months=0')).status).toBe(400);
  });
});
