import client, { unwrap } from './client';

/** The month's setup: income, savings goal, loans, fixed expenses and live totals. */
export const getBudget = (month) => unwrap(client.get(`/budgets/${month}`));
export const createBudget = (month, body) => unwrap(client.post(`/budgets/${month}`, body));
export const updateBudget = (month, body) => unwrap(client.put(`/budgets/${month}`, body));

/** Create the month's budget if it does not exist yet, otherwise update it. */
export const saveBudget = (month, body, exists) =>
  exists ? updateBudget(month, body) : createBudget(month, body);

export const copyFromMonth = (month, prevMonth) =>
  unwrap(client.post(`/budgets/${month}/copy-from/${prevMonth}`));
