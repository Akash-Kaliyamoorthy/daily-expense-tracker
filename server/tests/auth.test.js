const { app, request, resetDb, registerAgent, closePool, query } = require('./helpers');
const { signToken } = require('../src/middleware/auth');

beforeAll(resetDb);
afterAll(closePool);

describe('health', () => {
  test('GET /health reports ok when the database is reachable', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'OK', data: { status: 'ok' } });
  });
});

describe('POST /api/auth/register', () => {
  test('creates an account, sets an httpOnly cookie and never returns the hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '  Asha  ', email: 'Asha@Example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: 'Asha', email: 'asha@example.com' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/det_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    // The password is stored hashed, never in plain text.
    const { rows } = await query('SELECT password_hash FROM users WHERE email = $1', [
      'asha@example.com',
    ]);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toContain('password123');
  });

  test('rejects a duplicate email regardless of letter case', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'ASHA@example.COM', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test.each([
    ['short password', { name: 'A', email: 'a@b.co', password: 'short' }, 'password'],
    ['bad email', { name: 'A', email: 'not-an-email', password: 'password123' }, 'email'],
    ['missing name', { email: 'a@b.co', password: 'password123' }, 'name'],
  ])('validation: %s returns 400 with a field error', async (_label, body, field) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.map((e) => e.field)).toContain(field);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ASHA@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('asha@example.com');
    expect(res.headers['set-cookie'].join(';')).toMatch(/det_token=/);
  });

  test('gives the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });
});

describe('sessions and protected routes', () => {
  test('GET /api/auth/me works with the cookie and fails without it', async () => {
    const { agent, user } = await registerAgent('me@example.com');
    const ok = await agent.get('/api/auth/me');
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.id).toBe(user.id);

    const anonymous = await request(app).get('/api/auth/me');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toMatchObject({ success: false, data: null });
  });

  test('accepts an Authorization: Bearer token as well as the cookie', async () => {
    const { user } = await registerAgent('bearer@example.com');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signToken(user.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('bearer@example.com');
  });

  test('rejects garbage and tampered tokens', async () => {
    const garbage = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer abc.def.ghi');
    expect(garbage.status).toBe(401);
    const { user } = await registerAgent('tamper@example.com');
    const tampered = signToken(user.id).slice(0, -2) + 'xx';
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  test('logout clears the cookie so the session no longer works', async () => {
    const { agent } = await registerAgent('logout@example.com');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  test('a token for a deleted account stops working immediately', async () => {
    const { agent, user } = await registerAgent('gone@example.com');
    await query('DELETE FROM users WHERE id = $1', [user.id]);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  test.each([
    '/api/expenses',
    '/api/loans?month=2026-11',
    '/api/categories',
    '/api/summary/2026-11',
  ])('GET %s requires login', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });

  test('unknown API routes return a JSON 404 when logged in, and 401 when not', async () => {
    // Logged-out visitors get 401 first, so the API never reveals which routes exist.
    expect((await request(app).get('/api/does-not-exist')).status).toBe(401);

    const { agent } = await registerAgent('lost@example.com');
    const res = await agent.get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, data: null });
  });

  test('malformed JSON returns a 400, not a crash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
