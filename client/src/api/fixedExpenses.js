import client, { unwrap } from './client';

export const listFixedExpenses = (month) =>
  unwrap(client.get('/fixed-expenses', { params: { month } }));
export const createFixedExpense = (body) => unwrap(client.post('/fixed-expenses', body));
export const updateFixedExpense = (id, body) => unwrap(client.put(`/fixed-expenses/${id}`, body));
export const deleteFixedExpense = (id) => unwrap(client.delete(`/fixed-expenses/${id}`));
