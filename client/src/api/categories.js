import client, { unwrap } from './client';

export const listCategories = () => unwrap(client.get('/categories'));
export const createCategory = (body) => unwrap(client.post('/categories', body));
export const updateCategory = (id, body) => unwrap(client.put(`/categories/${id}`, body));
export const deleteCategory = (id) => unwrap(client.delete(`/categories/${id}`));
