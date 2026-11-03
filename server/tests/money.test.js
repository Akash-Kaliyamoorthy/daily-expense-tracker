const {
  parsePaiseStrict,
  toPaise,
  fromPaise,
  sumPaise,
  percentOfPaise,
  budgetStatus,
  monthPosition,
  computeBudgetSummary,
} = require('../src/utils/money');

describe('money primitives', () => {
  test('parsePaiseStrict accepts valid amounts and rejects bad ones', () => {
    expect(parsePaiseStrict('1250.50')).toBe(125050);
    expect(parsePaiseStrict(99)).toBe(9900);
    expect(parsePaiseStrict('0.5')).toBe(50);
    expect(parsePaiseStrict('10.')).toBeNull();
    expect(parsePaiseStrict('1.234')).toBeNull(); // more than 2 decimals
    expect(parsePaiseStrict('-5')).toBeNull();
    expect(parsePaiseStrict('1e3')).toBeNull();
    expect(parsePaiseStrict('')).toBeNull();
    expect(parsePaiseStrict(NaN)).toBeNull();
    expect(parsePaiseStrict(null)).toBeNull();
  });

  test('toPaise / fromPaise round-trip exactly (no float drift)', () => {
    expect(toPaise('0.10') + toPaise('0.20')).toBe(30); // 0.1 + 0.2 === 0.3
    expect(fromPaise(toPaise('0.10') + toPaise('0.20'))).toBe('0.30');
    expect(fromPaise(toPaise('1234.50'))).toBe('1234.50');
    expect(fromPaise(-505)).toBe('-5.05');
    expect(toPaise(null)).toBe(0);
    expect(toPaise('100')).toBe(10000);
    expect(toPaise('1.005')).toBe(101); // half-up on the third decimal
    expect(() => toPaise('abc')).toThrow(TypeError);
  });

  test('sumPaise and percentOfPaise', () => {
    expect(sumPaise([{ a: '10.10' }, { a: '20.20' }, { a: '0.01' }], 'a')).toBe(3031);
    expect(sumPaise(undefined, 'a')).toBe(0);
    expect(percentOfPaise(10_000_000, 20)).toBe(2_000_000);
    expect(percentOfPaise(10_000_000, '12.5')).toBe(1_250_000);
  });

  test('budgetStatus boundaries: <70% green, 70-100% amber, >100% red', () => {
    expect(budgetStatus(69_999, 100_000)).toBe('green');
    expect(budgetStatus(70_000, 100_000)).toBe('amber');
    expect(budgetStatus(100_000, 100_000)).toBe('amber');
    expect(budgetStatus(100_001, 100_000)).toBe('red');
    expect(budgetStatus(0, 0)).toBe('green');
    expect(budgetStatus(1, 0)).toBe('red');
    expect(budgetStatus(1, -500)).toBe('red');
  });

  test('monthPosition for past, current and future months', () => {
    expect(monthPosition('2026-10', '2026-11-10')).toEqual({
      state: 'past',
      days: 31,
      dayOfMonth: 31,
      daysLeft: 0,
    });
    expect(monthPosition('2026-11', '2026-11-10')).toEqual({
      state: 'current',
      days: 30,
      dayOfMonth: 10,
      daysLeft: 21, // today counts
    });
    expect(monthPosition('2026-12', '2026-11-10').state).toBe('future');
  });
});

describe('computeBudgetSummary', () => {
  const base = {
    month: '2026-11',
    today: '2026-11-10',
    salary: '125000.00',
    other_income: '0',
    savings_goal: '10000.00',
    savings_goal_type: 'amount',
    loans: [{ emi_amount: '20000.00' }, { emi_amount: '5000.00' }],
    fixed_expenses: [{ amount: '30000.00' }],
    spent_total: '0',
    spent_today: '0',
  };

  test('core formulas: commitments, disposable, daily budget', () => {
    const s = computeBudgetSummary({ ...base, today: '2026-11-01' });
    expect(s.total_commitments).toBe(55000);
    expect(s.disposable).toBe(60000); // 125000 - 55000 - 10000
    expect(s.days_in_month).toBe(30);
    expect(s.daily_budget).toBe(2000);
    expect(s.remaining_daily_budget).toBe(2000);
    expect(s.remaining_balance).toBe(70000);
    expect(s.budget_status).toBe('green');
    expect(s.warnings).toEqual([]);
  });

  test('remaining daily budget adapts to spending and days left', () => {
    // spent 12,000 total, 1,000 of it today -> 49,000 available / 21 days left
    const s = computeBudgetSummary({ ...base, spent_total: '12000', spent_today: '1000' });
    expect(s.days_left).toBe(21);
    expect(s.remaining_daily_budget).toBe(2333.33);
    expect(s.remaining_disposable).toBe(48000);
    expect(s.remaining_balance).toBe(58000);
    expect(s.used_pct).toBe(20);
  });

  test('other income is added to the pool', () => {
    const s = computeBudgetSummary({ ...base, other_income: '5000' });
    expect(s.total_income).toBe(130000);
    expect(s.disposable).toBe(65000);
  });

  test('percentage savings goal is a % of salary', () => {
    const s = computeBudgetSummary({ ...base, savings_goal: '20', savings_goal_type: 'percent' });
    expect(s.savings_goal).toBe(25000);
    expect(s.disposable).toBe(45000);
  });

  test('days in month: 28, 29 (leap) and 31', () => {
    expect(
      computeBudgetSummary({ ...base, month: '2026-02', today: '2026-02-01' }).days_in_month,
    ).toBe(28);
    expect(
      computeBudgetSummary({ ...base, month: '2028-02', today: '2028-02-01' }).days_in_month,
    ).toBe(29);
    const dec = computeBudgetSummary({ ...base, month: '2026-12', today: '2026-12-01' });
    expect(dec.days_in_month).toBe(31);
    expect(dec.daily_budget).toBe(1935.48); // 60000 / 31
  });

  test('salary = 0: no income warning, zero budgets, no crash', () => {
    const s = computeBudgetSummary({
      ...base,
      salary: '0',
      loans: [],
      fixed_expenses: [],
      savings_goal: '0',
    });
    expect(s.total_income).toBe(0);
    expect(s.daily_budget).toBe(0);
    expect(s.used_pct).toBeNull();
    expect(s.savings_progress_pct).toBeNull();
    expect(s.warnings.map((w) => w.code)).toEqual(['NO_INCOME']);
  });

  test('commitments above income: negative disposable is flagged, not hidden', () => {
    const s = computeBudgetSummary({ ...base, salary: '40000' });
    expect(s.disposable).toBe(-25000);
    expect(s.is_over_committed).toBe(true);
    expect(s.daily_budget).toBe(0);
    expect(s.remaining_balance).toBe(-15000);
    expect(s.budget_status).toBe('green'); // nothing spent yet
    expect(s.warnings.map((w) => w.code)).toContain('OVER_COMMITTED');
    const spending = computeBudgetSummary({ ...base, salary: '40000', spent_total: '100' });
    expect(spending.budget_status).toBe('red');
  });

  test('80% warning, month exceeded and today exceeded', () => {
    const at80 = computeBudgetSummary({ ...base, spent_total: '48000', spent_today: '0' });
    expect(at80.budget_status).toBe('amber');
    expect(at80.warnings.map((w) => w.code)).toEqual(['MONTH_80']);

    const over = computeBudgetSummary({ ...base, spent_total: '61000', spent_today: '5000' });
    expect(over.budget_status).toBe('red');
    expect(over.warnings.map((w) => w.code)).toEqual(['MONTH_EXCEEDED', 'TODAY_EXCEEDED']);

    const todayOnly = computeBudgetSummary({ ...base, spent_total: '5000', spent_today: '5000' });
    expect(todayOnly.warnings.map((w) => w.code)).toEqual(['TODAY_EXCEEDED']);
  });

  test('past months have no days left and no "today" warning', () => {
    const s = computeBudgetSummary({
      ...base,
      month: '2026-10',
      spent_total: '1000',
      spent_today: '0',
    });
    expect(s.month_state).toBe('past');
    expect(s.days_left).toBe(0);
    expect(s.remaining_daily_budget).toBe(0);
    expect(s.warnings).toEqual([]);
  });

  test('savings progress reflects how much of the goal is still protected', () => {
    expect(computeBudgetSummary(base).savings_progress_pct).toBe(100);
    // spend 65,000: remaining balance 5,000 -> only half of the 10,000 goal is safe
    const s = computeBudgetSummary({ ...base, spent_total: '65000' });
    expect(s.savings_secured).toBe(5000);
    expect(s.savings_progress_pct).toBe(50);
    // overspend completely
    expect(computeBudgetSummary({ ...base, spent_total: '80000' }).savings_progress_pct).toBe(0);
  });
});
