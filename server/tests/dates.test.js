const {
  isValidMonth,
  isValidDate,
  daysInMonth,
  monthRange,
  addMonths,
  lastNMonths,
  addDays,
  diffDays,
  todayISO,
  dateForDay,
  nextOccurrence,
  upcomingDues,
} = require('../src/utils/dates');

describe('calendar helpers', () => {
  test('daysInMonth handles 28-31 days and leap years', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2100-02')).toBe(28); // century rule
    expect(daysInMonth('2026-04')).toBe(30);
    expect(daysInMonth('2026-12')).toBe(31);
  });

  test('validation rejects impossible values', () => {
    expect(isValidMonth('2026-11')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-2-3')).toBe(false);
  });

  test('monthRange, addMonths, lastNMonths', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(lastNMonths('2026-11', 6)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  test('addDays / diffDays cross month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-11-01', '2026-11-08')).toBe(7);
  });

  test('todayISO uses the given timezone, not the server timezone', () => {
    const instant = new Date('2026-10-31T20:00:00Z'); // 01:30 on 1 Nov in India
    expect(todayISO('Asia/Kolkata', instant)).toBe('2026-11-01');
    expect(todayISO('UTC', instant)).toBe('2026-10-31');
  });
});

describe('recurrence and dues', () => {
  test('dateForDay clamps day 31 to the last day of shorter months', () => {
    expect(dateForDay('2026-02', 31)).toBe('2026-02-28');
    expect(dateForDay('2026-11', 31)).toBe('2026-11-30');
    expect(dateForDay('2026-12', 31)).toBe('2026-12-31');
  });

  test('nextOccurrence: daily, weekly and monthly (anchored)', () => {
    expect(nextOccurrence('daily', '2026-11-30', 30)).toBe('2026-12-01');
    expect(nextOccurrence('weekly', '2026-11-28', 28)).toBe('2026-12-05');
    expect(nextOccurrence('monthly', '2026-01-31', 31)).toBe('2026-02-28');
    expect(nextOccurrence('monthly', '2026-02-28', 31)).toBe('2026-03-31');
    expect(nextOccurrence('monthly', '2026-12-15', 15)).toBe('2027-01-15');
    expect(() => nextOccurrence('yearly', '2026-01-01', 1)).toThrow();
  });

  test('upcomingDues returns items in the next 7 days, sorted, across month end', () => {
    const items = [
      { type: 'loan', name: 'Home loan', amount: '20000', due_day: 3 },
      { type: 'fixed', name: 'Rent', amount: '15000', due_day: 1 },
      { type: 'fixed', name: 'Internet', amount: '800', due_day: 31 }, // -> Nov 30
      { type: 'loan', name: 'Car loan', amount: '9000', due_day: 15 }, // not in window
    ];
    const dues = upcomingDues(items, '2026-11-28', 7);
    expect(dues.map((d) => [d.name, d.due_date, d.days_away])).toEqual([
      ['Internet', '2026-11-30', 2],
      ['Rent', '2026-12-01', 3],
      ['Home loan', '2026-12-03', 5],
    ]);
  });

  test('an item due today is included, one due yesterday is not', () => {
    const items = [
      { type: 'fixed', name: 'Today', amount: '1', due_day: 10 },
      { type: 'fixed', name: 'Yesterday', amount: '1', due_day: 9 },
    ];
    expect(upcomingDues(items, '2026-11-10', 7).map((d) => d.name)).toEqual(['Today']);
  });
});
