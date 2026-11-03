// Runs before every test file. Forces test mode so config/env.js uses
// TEST_DATABASE_URL (never your real DATABASE_URL) and cheap bcrypt rounds.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-only-secret-not-used-anywhere-else-0123456789';
process.env.APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
