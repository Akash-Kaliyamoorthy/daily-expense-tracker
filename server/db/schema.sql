-- =============================================================================
-- Daily Expense Tracker - PostgreSQL schema
-- =============================================================================
-- Idempotent: safe to run on every server boot (see src/db/migrate.js).
-- Default categories are seeded separately by src/db/seed.js.
--
-- Conventions
--   * Money is always NUMERIC(12,2), never floating point.
--   * Every table has created_at / updated_at (kept fresh by a trigger).
--   * Every user-owned row cascades on user delete.
--   * Months are stored as 'YYYY-MM' text and validated by a CHECK.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared trigger function: keeps updated_at current on every UPDATE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  email          VARCHAR(255) NOT NULL,
  password_hash  TEXT         NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness: "A@x.com" and "a@x.com" are the same account.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email));

-- -----------------------------------------------------------------------------
-- categories
--   user_id IS NULL      -> built-in default category (shared, read-only)
--   user_id = <user id>  -> custom category owned by that user
--   monthly_limit        -> limit for custom categories. Limits for the shared
--                           defaults are per-user and live in category_limits.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(50)  NOT NULL CHECK (char_length(btrim(name)) >= 1),
  color          VARCHAR(7)   NOT NULL DEFAULT '#6366f1'
                 CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  monthly_limit  NUMERIC(12,2) CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Defaults are shared and cannot carry a per-category limit on this row.
  CONSTRAINT categories_default_no_limit CHECK (user_id IS NOT NULL OR monthly_limit IS NULL)
);

-- Name uniqueness: one default per name, and one custom per name per user.
CREATE UNIQUE INDEX IF NOT EXISTS categories_default_name_uidx
  ON categories (lower(name)) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_uidx
  ON categories (user_id, lower(name)) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories (user_id);

-- -----------------------------------------------------------------------------
-- category_limits
--   Per-user monthly limit for a *default* category (custom categories use
--   categories.monthly_limit directly). Lets each user set their own limits
--   on the shared defaults without duplicating them.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_limits (
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id    BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_limit  NUMERIC(12,2) NOT NULL CHECK (monthly_limit >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category_id)
);

-- -----------------------------------------------------------------------------
-- monthly_budgets  (one row per user per month)
--   savings_goal_type = 'amount'  -> savings_goal is rupees
--   savings_goal_type = 'percent' -> savings_goal is 0-100 (% of salary)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_budgets (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month               CHAR(7) NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  salary              NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (salary >= 0),
  other_income        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (other_income >= 0),
  other_income_note   VARCHAR(200),
  savings_goal        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (savings_goal >= 0),
  savings_goal_type   VARCHAR(7) NOT NULL DEFAULT 'amount'
                      CHECK (savings_goal_type IN ('amount', 'percent')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT monthly_budgets_user_month_uniq UNIQUE (user_id, month),
  CONSTRAINT monthly_budgets_percent_range
    CHECK (savings_goal_type <> 'percent' OR savings_goal <= 100)
);

CREATE INDEX IF NOT EXISTS monthly_budgets_user_id_idx ON monthly_budgets (user_id);

-- -----------------------------------------------------------------------------
-- loans  (EMIs for a given month's budget)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loans (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget_id         BIGINT NOT NULL REFERENCES monthly_budgets(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  emi_amount        NUMERIC(12,2) NOT NULL CHECK (emi_amount > 0),
  due_day           SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  remaining_months  INTEGER CHECK (remaining_months IS NULL OR remaining_months >= 0),
  lender            VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loans_user_id_idx   ON loans (user_id);
CREATE INDEX IF NOT EXISTS loans_budget_id_idx ON loans (budget_id);

-- -----------------------------------------------------------------------------
-- fixed_expenses  (rent, electricity, subscriptions, ... for a month's budget)
--   category_id is nullable: if a category is ever removed outside the app's
--   "reassign to Other" flow, the row survives instead of blocking the delete.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget_id    BIGINT NOT NULL REFERENCES monthly_budgets(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category_id  BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  due_day      SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fixed_expenses_user_id_idx     ON fixed_expenses (user_id);
CREATE INDEX IF NOT EXISTS fixed_expenses_budget_id_idx   ON fixed_expenses (budget_id);
CREATE INDEX IF NOT EXISTS fixed_expenses_category_id_idx ON fixed_expenses (category_id);

-- -----------------------------------------------------------------------------
-- recurring_expenses  (templates that auto-create expense rows)
--   anchor_day remembers the intended day-of-month for 'monthly' items so a
--   rule created on the 31st correctly returns to the 31st after short months.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category_id     BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'UPI'
                  CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Net Banking')),
  frequency       VARCHAR(10) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  next_date       DATE NOT NULL,
  anchor_day      SMALLINT NOT NULL CHECK (anchor_day BETWEEN 1 AND 31),
  note            VARCHAR(255),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recurring_user_id_idx ON recurring_expenses (user_id);
-- Used by the catch-up processor: "active rules whose next_date has arrived".
CREATE INDEX IF NOT EXISTS recurring_due_idx
  ON recurring_expenses (next_date) WHERE active;

-- -----------------------------------------------------------------------------
-- expenses  (the daily log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'UPI'
                  CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Net Banking')),
  note            VARCHAR(255),
  recurring_id    BIGINT REFERENCES recurring_expenses(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_user_date_idx     ON expenses (user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_user_category_idx ON expenses (user_id, category_id);
CREATE INDEX IF NOT EXISTS expenses_category_id_idx   ON expenses (category_id);
CREATE INDEX IF NOT EXISTS expenses_recurring_id_idx  ON expenses (recurring_id);
-- Prevents the catch-up processor from double-inserting the same occurrence
-- if two instances run it at the same moment.
CREATE UNIQUE INDEX IF NOT EXISTS expenses_recurring_occurrence_uidx
  ON expenses (recurring_id, expense_date) WHERE recurring_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- updated_at triggers (DROP + CREATE keeps this idempotent on all PG versions)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'categories', 'category_limits', 'monthly_budgets', 'loans',
    'fixed_expenses', 'recurring_expenses', 'expenses'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_set_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t || '_set_updated_at', t
    );
  END LOOP;
END;
$$;
