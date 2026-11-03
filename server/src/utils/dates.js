'use strict';

/**
 * Calendar helpers. Dates are plain 'YYYY-MM-DD' strings and months are
 * 'YYYY-MM' strings everywhere, so no timezone shifting can creep in.
 * Pure module: no DB, no I/O.
 */

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n) => String(n).padStart(2, '0');

function isValidMonth(value) {
  return typeof value === 'string' && MONTH_RE.test(value);
}

/** True only for real calendar dates (rejects 2026-02-30). */
function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Number of days in a 'YYYY-MM' month (28-31, leap years handled). */
function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** First and last date of a month: { start: '2026-11-01', end: '2026-11-30' }. */
function monthRange(month) {
  return { start: `${month}-01`, end: `${month}-${pad2(daysInMonth(month))}` };
}

function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}`;
}

const prevMonth = (month) => addMonths(month, -1);

/** The last `n` months ending at `endMonth`, oldest first. */
function lastNMonths(endMonth, n) {
  return Array.from({ length: n }, (_, i) => addMonths(endMonth, i - (n - 1)));
}

function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b - a). */
function diffDays(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Today's date ('YYYY-MM-DD') in the given IANA timezone. */
function todayISO(timeZone = 'Asia/Kolkata', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const currentMonth = (timeZone, now) => todayISO(timeZone, now).slice(0, 7);

/** A due day of 31 in a 30-day month means "the last day of the month". */
const clampDay = (month, day) => Math.min(day, daysInMonth(month));

const dateForDay = (month, day) => `${month}-${pad2(clampDay(month, day))}`;

/**
 * Next occurrence of a recurring item after `isoDate`.
 * Monthly items return to `anchorDay` after short months (31st -> Feb 28 -> Mar 31).
 */
function nextOccurrence(frequency, isoDate, anchorDay) {
  switch (frequency) {
    case 'daily':
      return addDays(isoDate, 1);
    case 'weekly':
      return addDays(isoDate, 7);
    case 'monthly':
      return dateForDay(addMonths(isoDate.slice(0, 7), 1), anchorDay);
    default:
      throw new Error(`Unknown recurrence frequency: ${frequency}`);
  }
}

/**
 * Items (loans / fixed expenses) falling due within the next `windowDays`
 * days, today included. Looks at this month and next so a window that crosses
 * a month boundary still works.
 *
 * @param {Array<{type:string,name:string,amount:string|number,due_day:number}>} items
 */
function upcomingDues(items, today, windowDays = 7) {
  const last = addDays(today, windowDays);
  const months = [today.slice(0, 7), addMonths(today.slice(0, 7), 1)];
  const dues = [];
  for (const item of items) {
    for (const month of months) {
      const dueDate = dateForDay(month, item.due_day);
      if (dueDate >= today && dueDate <= last) {
        dues.push({ ...item, due_date: dueDate, days_away: diffDays(today, dueDate) });
      }
    }
  }
  return dues.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name));
}

module.exports = {
  isValidMonth,
  isValidDate,
  daysInMonth,
  monthRange,
  addMonths,
  prevMonth,
  lastNMonths,
  addDays,
  diffDays,
  todayISO,
  currentMonth,
  clampDay,
  dateForDay,
  nextOccurrence,
  upcomingDues,
};
