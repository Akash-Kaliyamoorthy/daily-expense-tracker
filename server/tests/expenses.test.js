const env = require('../src/config/env');
const { todayISO, addDays } = require('../src/utils/dates');
const { resetDb, registerAgent, categoryId, closePool, query, app, request } = require('./helpers');

let agent;
let other; // a second user, to prove data isolation
let foodId;
let groceriesId;

beforeAll(async () => {
  await resetDb();
  ({ agent } = await registerAgent('owner@example.com'));
  ({ agent: other } = await registerAgent('stranger@example.com'));
  foodId = await categoryId(agent, 'Food');
  groceriesId = await categoryId(agent, 'Groceries');
});
afterAll(closePool);

const add = (body) => agent.post('/api/expenses').send(body);

describe('expense CRUD', () => {
  test('creates an expense; date defaults to today and money stays exact', async () => {
    const res = await add({ amount: '0.10', category_id: foodId, note: '  chai  ' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      amount: 0.1,
      category_id: foodId,
      category_name: 'Food',
      payment_method: 'UPI',
      note: 'chai',
      expense_date: todayISO(env.timezone),
    });
    await add({ amount: '0.20', category_id: foodId });

    // 0.1 + 0.2 must be exactly 0.3 (floating point would give 0.30000000000000004).
    const { rows } = await query(
      `SELECT SUM(amount)::text AS total FROM expenses
        WHERE user_id = (SELECT id FROM users WHERE email = 'owner@example.com')`,
    );
    expect(rows[0].total).toBe('0.30');
  });

  test('stores an uncategorised expense and reports it as "Other"', async () => {
    const res = await add({ amount: 15, payment_method: 'Cash' });
    expect(res.status).toBe(201);
    expect(res.body.data.category_id).toBeNull();
    expect(res.body.data.category_name).toBe('Other');
  });

  test.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -50 }],
    ['three decimals', { amount: '10.999' }],
    ['text amount', { amount: 'abc' }],
    ['impossible date', { amount: 10, expense_date: '2026-02-30' }],
    ['bad payment method', { amount: 10, payment_method: 'Bitcoin' }],
    ['unknown category', { amount: 10, category_id: 999999 }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await add(body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('gets, updates and deletes an expense', async () => {
    const created = (await add({ amount: 250, category_id: foodId, note: 'lunch' })).body.data;

    const got = await agent.get(`/api/expenses/${created.id}`);
    expect(got.status).toBe(200);
    expect(got.body.data.note).toBe('lunch');

    const updated = await agent.put(`/api/expenses/${created.id}`).send({
      amount: '300.50',
      expense_date: '2026-10-05',
      category_id: groceriesId,
      payment_method: 'Card',
      note: null,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      amount: 300.5,
      expense_date: '2026-10-05',
      category_name: 'Groceries',
      payment_method: 'Card',
      note: null,
    });

    const deleted = await agent.delete(`/api/expenses/${created.id}`);
    expect(deleted.status).toBe(200);
    expect((await agent.get(`/api/expenses/${created.id}`)).status).toBe(404);
    expect((await agent.delete(`/api/expenses/${created.id}`)).status).toBe(404);
  });
});

describe('data isolation between users', () => {
  test("another user cannot read, edit or delete someone else's expense", async () => {
    const mine = (await add({ amount: 99, category_id: foodId })).body.data;

    expect((await other.get(`/api/expenses/${mine.id}`)).status).toBe(404);
    const edit = await other.put(`/api/expenses/${mine.id}`).send({
      amount: 1,
      expense_date: '2026-11-01',
      category_id: null,
      payment_method: 'Cash',
    });
    expect(edit.status).toBe(404);
    expect((await other.delete(`/api/expenses/${mine.id}`)).status).toBe(404);

    // ...and it never shows up in their list or summary.
    const list = await other.get('/api/expenses');
    expect(list.body.data.total).toBe(0);

    // The owner's copy is untouched.
    expect((await agent.get(`/api/expenses/${mine.id}`)).body.data.amount).toBe(99);
  });

  test("cannot attach an expense to someone else's custom category", async () => {
    const theirs = (await other.post('/api/categories').send({ name: 'Secret' })).body.data;
    const res = await add({ amount: 10, category_id: theirs.id });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses: filters, search, sort, pagination', () => {
  beforeAll(async () => {
    // A known set in January 2025, far from any other test data.
    const rows = [
      {
        amount: 100,
        expense_date: '2025-01-05',
        category_id: foodId,
        payment_method: 'UPI',
        note: 'Pizza night',
      },
      {
        amount: 2500,
        expense_date: '2025-01-10',
        category_id: groceriesId,
        payment_method: 'Card',
        note: 'Monthly groceries',
      },
      {
        amount: 40,
        expense_date: '2025-01-15',
        category_id: foodId,
        payment_method: 'Cash',
        note: '50% off coffee',
      },
      {
        amount: 700,
        expense_date: '2025-01-20',
        category_id: null,
        payment_method: 'UPI',
        note: '5000 steps challenge',
      },
      {
        amount: 60,
        expense_date: '2025-01-31',
        category_id: groceriesId,
        payment_method: 'Cash',
        note: null,
      },
    ];
    for (const row of rows) expect((await add(row)).status).toBe(201);
  });

  const jan = 'from=2025-01-01&to=2025-01-31';
  const list = async (qs) => (await agent.get(`/api/expenses?${jan}&${qs}`)).body.data;

  test('date range is inclusive and totals add up', async () => {
    const data = await list('');
    expect(data.total).toBe(5);
    expect(data.total_amount).toBe(3400);
    const narrow = (await agent.get('/api/expenses?from=2025-01-10&to=2025-01-20')).body.data;
    expect(narrow.items.map((e) => e.expense_date).sort()).toEqual([
      '2025-01-10',
      '2025-01-15',
      '2025-01-20',
    ]);
  });

  test('filters by category, "none" and payment method', async () => {
    expect((await list(`category=${foodId}`)).total).toBe(2);
    expect((await list('category=none')).total).toBe(1);
    const cash = await list('method=Cash');
    expect(cash.items.map((e) => e.amount).sort((a, b) => a - b)).toEqual([40, 60]);
    expect((await list(`category=${foodId}&method=Cash`)).total).toBe(1);
  });

  test('searches notes case-insensitively and treats % and _ literally', async () => {
    expect((await list('q=PIZZA')).total).toBe(1);
    const percent = await list('q=50%25'); // "50%"
    expect(percent.total).toBe(1);
    expect(percent.items[0].note).toBe('50% off coffee');
  });

  test('sorts by amount and date', async () => {
    expect((await list('sort=amount_desc')).items.map((e) => e.amount)).toEqual([
      2500, 700, 100, 60, 40,
    ]);
    expect((await list('sort=amount_asc')).items[0].amount).toBe(40);
    expect((await list('sort=date_asc')).items[0].expense_date).toBe('2025-01-05');
    expect((await list('')).items[0].expense_date).toBe('2025-01-31'); // default: newest first
  });

  test('paginates and reports totals independent of the page', async () => {
    const page3 = await list('limit=2&page=3&sort=amount_desc');
    expect(page3).toMatchObject({
      page: 3,
      limit: 2,
      total: 5,
      total_pages: 3,
      total_amount: 3400,
    });
    expect(page3.items.map((e) => e.amount)).toEqual([40]);
    expect((await list('limit=2&page=9')).items).toEqual([]);
  });

  test('rejects invalid query values', async () => {
    for (const qs of [
      'limit=1000',
      'sort=hacker',
      'from=2025-02-01&to=2025-01-01',
      'category=abc',
    ]) {
      expect((await agent.get(`/api/expenses?${qs}`)).status).toBe(400);
    }
  });
});

describe('categories', () => {
  test('lists defaults first, "Other" last among them, then custom ones', async () => {
    const { body } = await agent.get('/api/categories');
    const names = body.data.items.map((c) => c.name);
    expect(names.slice(0, 3)).toEqual(['Bills', 'Education', 'Entertainment']);
    expect(names.indexOf('Other')).toBe(10);
    expect(body.data.items.filter((c) => c.is_default)).toHaveLength(11);
  });

  test('creates a custom category, blocks duplicates of defaults and of itself', async () => {
    const res = await agent.post('/api/categories').send({ name: 'Pets', color: '#112233' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Pets', color: '#112233', is_default: false });
    expect((await agent.post('/api/categories').send({ name: 'pets' })).status).toBe(409);
    expect((await agent.post('/api/categories').send({ name: 'food' })).status).toBe(409);
    expect((await agent.post('/api/categories').send({ name: 'X', color: 'red' })).status).toBe(
      400,
    );
  });

  test('defaults cannot be renamed or deleted, but accept a personal limit', async () => {
    expect((await agent.put(`/api/categories/${foodId}`).send({ name: 'Meals' })).status).toBe(403);
    expect((await agent.delete(`/api/categories/${foodId}`)).status).toBe(403);

    const set = await agent.put(`/api/categories/${foodId}`).send({ monthly_limit: 5000 });
    expect(set.status).toBe(200);
    expect(set.body.data.monthly_limit).toBe(5000);
    // The limit is per user: the other account still sees none.
    const theirs = (await other.get('/api/categories')).body.data.items.find(
      (c) => c.name === 'Food',
    );
    expect(theirs.monthly_limit).toBeNull();

    const cleared = await agent.put(`/api/categories/${foodId}`).send({ monthly_limit: null });
    expect(cleared.body.data.monthly_limit).toBeNull();
  });

  test('deleting a custom category moves its expenses, fixed expenses and rules to "Other"', async () => {
    const gym = (await agent.post('/api/categories').send({ name: 'Gym' })).body.data;
    const expense = (await add({ amount: 800, category_id: gym.id, note: 'membership' })).body.data;
    const fixed = await agent
      .post('/api/fixed-expenses')
      .send({ month: '2025-06', name: 'Gym fee', amount: 800, category_id: gym.id, due_day: 3 });
    expect(fixed.status).toBe(201);

    const res = await agent.delete(`/api/categories/${gym.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reassigned_expenses).toBe(1);

    const moved = (await agent.get(`/api/expenses/${expense.id}`)).body.data;
    expect(moved.category_name).toBe('Other');
    expect(moved.amount).toBe(800); // nothing lost

    const fx = (await agent.get('/api/fixed-expenses?month=2025-06')).body.data.items[0];
    expect(fx.category_name).toBe('Other');
    expect((await agent.get('/api/categories')).body.data.items.some((c) => c.id === gym.id)).toBe(
      false,
    );
  });
});

describe('recurring expenses', () => {
  test('a back-dated weekly expense creates a rule and catches up missed occurrences', async () => {
    const today = todayISO(env.timezone);
    const start = addDays(today, -14);
    const res = await add({
      amount: 120,
      expense_date: start,
      category_id: foodId,
      note: 'weekly vegetables',
      recurring_frequency: 'weekly',
    });
    expect(res.status).toBe(201);
    const ruleId = res.body.data.recurring_id;
    expect(ruleId).toBeGreaterThan(0);

    // start, start+7, start+14 (= today) -> 3 entries
    const created = await agent.get(`/api/expenses?q=weekly%20vegetables&sort=date_asc`);
    expect(created.body.data.items.map((e) => e.expense_date)).toEqual([
      start,
      addDays(start, 7),
      today,
    ]);

    const rules = (await agent.get('/api/recurring')).body.data.items;
    const rule = rules.find((r) => r.id === ruleId);
    expect(rule).toMatchObject({
      frequency: 'weekly',
      amount: 120,
      active: true,
      next_date: addDays(today, 7),
    });

    // Pause and resume
    const paused = await agent.patch(`/api/recurring/${ruleId}`).send({ active: false });
    expect(paused.body.data.active).toBe(false);
    const resumed = await agent.patch(`/api/recurring/${ruleId}`).send({ active: true });
    expect(resumed.body.data.active).toBe(true);
    expect(resumed.body.data.next_date >= today).toBe(true);

    // Deleting the rule keeps the expenses it already created.
    expect((await agent.delete(`/api/recurring/${ruleId}`)).status).toBe(200);
    expect((await agent.get('/api/expenses?q=weekly%20vegetables')).body.data.total).toBe(3);
  });

  test("another user cannot see or change someone's recurring rules", async () => {
    const created = await add({ amount: 10, recurring_frequency: 'daily', note: 'secret rule' });
    const ruleId = created.body.data.recurring_id;
    expect((await other.get('/api/recurring')).body.data.items).toEqual([]);
    expect((await other.patch(`/api/recurring/${ruleId}`).send({ active: false })).status).toBe(
      404,
    );
    expect((await other.delete(`/api/recurring/${ruleId}`)).status).toBe(404);
  });
});

describe('GET /api/export/csv', () => {
  test('downloads a CSV with a BOM, headers and escaped cells', async () => {
    await add({
      amount: 75.5,
      expense_date: '2024-12-15',
      category_id: foodId,
      note: '=HYPERLINK("http://evil.example")',
    });
    await add({ amount: 20, expense_date: '2024-12-16', note: 'tea, biscuits "yum"' });

    const res = await agent.get('/api/export/csv?from=2024-12-01&to=2024-12-31');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toContain('expenses_2024-12-01_to_2024-12-31.csv');

    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Date,Amount (INR),Category,Payment Method,Note,Recurring');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("'=HYPERLINK"); // formula neutralised
    expect(lines[2]).toContain('"tea, biscuits ""yum"""'); // RFC 4180 quoting
  });

  test('requires both dates, a valid order, and a login', async () => {
    expect((await agent.get('/api/export/csv?from=2024-12-01')).status).toBe(400);
    expect((await agent.get('/api/export/csv?from=2024-12-31&to=2024-12-01')).status).toBe(400);
    expect((await request(app).get('/api/export/csv?from=2024-12-01&to=2024-12-31')).status).toBe(
      401,
    );
  });

  test("only contains the logged-in user's rows", async () => {
    const res = await other.get('/api/export/csv?from=2024-12-01&to=2024-12-31');
    expect(res.text.slice(1).trim().split('\r\n')).toHaveLength(1); // header only
  });
});
