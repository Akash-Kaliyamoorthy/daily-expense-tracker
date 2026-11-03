'use strict';

/**
 * Shared helpers for the API tests. These run against a REAL PostgreSQL
 * database (TEST_DATABASE_URL), exercising the same SQL as production.
 */
const request = require('supertest');
const app = require('../src/app');
const { migrate } = require('../src/db/migrate');
const { query, closePool } = require('../src/config/db');

/**
 * Migrate and wipe all users. Deleting users cascades to every user-owned row
 * (budgets, loans, expenses, custom categories...) while keeping the default
 * categories. TRUNCATE ... CASCADE would wipe the defaults too, so it is not used.
 */
async function resetDb() {
  await migrate();
  await query('DELETE FROM users');
}

/** Register a user; the returned agent keeps the login cookie for later calls. */
async function registerAgent(email = 'user@example.com', name = 'Test User') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'password123' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${res.text}`);
  return { agent, user: res.body.data.user };
}

/** Look up a category id by name (defaults) for the logged-in agent. */
async function categoryId(agent, name) {
  const res = await agent.get('/api/categories');
  const found = res.body.data.items.find((c) => c.name === name);
  if (!found) throw new Error(`category ${name} not found`);
  return found.id;
}

module.exports = { app, request, resetDb, registerAgent, categoryId, closePool, query };
