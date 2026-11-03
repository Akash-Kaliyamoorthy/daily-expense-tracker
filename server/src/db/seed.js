'use strict';

/**
 * Default (shared) categories. Rows with user_id IS NULL are visible to every
 * user and cannot be renamed or deleted from the app.
 */
const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#f97316' },
  { name: 'Groceries', color: '#22c55e' },
  { name: 'Transport', color: '#3b82f6' },
  { name: 'Fuel', color: '#ef4444' },
  { name: 'Shopping', color: '#ec4899' },
  { name: 'Health', color: '#14b8a6' },
  { name: 'Entertainment', color: '#a855f7' },
  { name: 'Bills', color: '#eab308' },
  { name: 'Education', color: '#6366f1' },
  { name: 'Travel', color: '#06b6d4' },
  { name: 'Other', color: '#64748b' },
];

/** Idempotent: safe to run on every boot. `db` is a pg Client or Pool. */
async function seedDefaultCategories(db) {
  for (const { name, color } of DEFAULT_CATEGORIES) {
    await db.query(
      `INSERT INTO categories (user_id, name, color)
       VALUES (NULL, $1, $2)
       ON CONFLICT (lower(name)) WHERE user_id IS NULL DO NOTHING`,
      [name, color],
    );
  }
}

/** The id of the default "Other" category (used when a category is deleted). */
async function getOtherCategoryId(db) {
  const { rows } = await db.query(
    `SELECT id FROM categories WHERE user_id IS NULL AND lower(name) = 'other'`,
  );
  if (!rows[0]) {
    throw new Error('Default "Other" category is missing. Run the migration first.');
  }
  return rows[0].id;
}

module.exports = { DEFAULT_CATEGORIES, seedDefaultCategories, getOtherCategoryId };
