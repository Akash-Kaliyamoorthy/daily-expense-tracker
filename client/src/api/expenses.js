import client, { unwrap } from './client';

/** Drops empty filter values so they never reach the query string. */
const clean = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );

export const listExpenses = (params = {}) =>
  unwrap(client.get('/expenses', { params: clean(params) }));
export const createExpense = (body) => unwrap(client.post('/expenses', body));
export const updateExpense = (id, body) => unwrap(client.put(`/expenses/${id}`, body));
export const deleteExpense = (id) => unwrap(client.delete(`/expenses/${id}`));

export const listRecurring = () => unwrap(client.get('/recurring'));
export const setRecurringActive = (id, active) =>
  unwrap(client.patch(`/recurring/${id}`, { active }));
export const deleteRecurring = (id) => unwrap(client.delete(`/recurring/${id}`));
