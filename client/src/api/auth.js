import client, { unwrap } from './client';

export const register = (body) => unwrap(client.post('/auth/register', body));
export const login = (body) => unwrap(client.post('/auth/login', body));
export const logout = () => unwrap(client.post('/auth/logout'));
export const fetchMe = () => unwrap(client.get('/auth/me'));
