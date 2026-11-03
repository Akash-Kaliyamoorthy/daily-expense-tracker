import client, { unwrap } from './client';

export const listLoans = (month) => unwrap(client.get('/loans', { params: { month } }));
export const createLoan = (body) => unwrap(client.post('/loans', body));
export const updateLoan = (id, body) => unwrap(client.put(`/loans/${id}`, body));
export const deleteLoan = (id) => unwrap(client.delete(`/loans/${id}`));
