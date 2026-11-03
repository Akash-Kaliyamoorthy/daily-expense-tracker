'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const serialize = require('../utils/serialize');
const { getOtherCategoryId } = require('../db/seed');

// Default categories are shared rows (user_id IS NULL). A user's limit on a
// default lives in category_limits; a custom category keeps its own limit.
const CATEGORY_SELECT = `
  SELECT c.id, c.name, c.color, (c.user_id IS NULL) AS is_default,
         CASE WHEN c.user_id IS NULL THEN cl.monthly_limit ELSE c.monthly_limit END AS monthly_limit
    FROM categories c
    LEFT JOIN category_limits cl ON cl.category_id = c.id AND cl.user_id = $1`;

/** A category the user may see/use: a default or one they own. Null if none. */
async function findVisibleCategory(db_, userId, id) {
  const { rows } = await db_.query(
    `${CATEGORY_SELECT} WHERE c.id = $2 AND (c.user_id IS NULL OR c.user_id = $1)`,
    [userId, id],
  );
  return rows[0] || null;
}

/** Throws a 400 unless `categoryId` is null or usable by this user. */
async function assertCategoryAccessible(db_, userId, categoryId) {
  if (categoryId === null || categoryId === undefined) return;
  const found = await findVisibleCategory(db_, userId, categoryId);
  if (!found) {
    throw ApiError.badRequest('Selected category does not exist.', [
      { in: 'body', field: 'category_id', message: 'Selected category does not exist.' },
    ]);
  }
}

const list = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `${CATEGORY_SELECT}
      WHERE c.user_id IS NULL OR c.user_id = $1
      ORDER BY (c.user_id IS NULL) DESC,
               (c.user_id IS NULL AND lower(c.name) = 'other'),
               lower(c.name)`,
    [req.user.id],
  );
  return sendSuccess(res, { items: rows.map(serialize.category) });
});

/** Custom names may not collide with a default name or another of the user's. */
async function assertNameFree(userId, name, exceptId = null) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM categories
      WHERE lower(name) = lower($1)
        AND (user_id IS NULL OR user_id = $2)
        AND ($3::bigint IS NULL OR id <> $3)`,
    [name, userId, exceptId],
  );
  if (rowCount > 0) {
    throw ApiError.conflict('A category with that name already exists.');
  }
}

const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, color, monthly_limit } = req.body;
  await assertNameFree(userId, name);

  let id;
  try {
    const { rows } = await db.query(
      `INSERT INTO categories (user_id, name, color, monthly_limit)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, name, color, monthly_limit],
    );
    id = rows[0].id;
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict('A category with that name already exists.');
    throw err;
  }
  const created = await findVisibleCategory(db, userId, id);
  return sendCreated(res, serialize.category(created), 'Category created');
});

const update = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const data = req.body;

  const existing = await findVisibleCategory(db, userId, id);
  if (!existing) throw ApiError.notFound('Category not found');

  if (existing.is_default) {
    // Shared categories: only the user's own spending limit can change.
    if (data.name !== undefined || data.color !== undefined) {
      throw ApiError.forbidden('Default categories cannot be renamed or recolored.');
    }
    if (data.monthly_limit === null) {
      await db.query('DELETE FROM category_limits WHERE user_id = $1 AND category_id = $2', [
        userId,
        id,
      ]);
    } else if (data.monthly_limit !== undefined) {
      await db.query(
        `INSERT INTO category_limits (user_id, category_id, monthly_limit) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, category_id) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit`,
        [userId, id, data.monthly_limit],
      );
    }
  } else {
    if (data.name !== undefined) await assertNameFree(userId, data.name, id);
    const sets = [];
    const values = [];
    for (const column of ['name', 'color', 'monthly_limit']) {
      if (data[column] !== undefined) {
        values.push(data[column]);
        sets.push(`${column} = $${values.length}`); // column names come from this fixed list
      }
    }
    if (sets.length > 0) {
      values.push(id, userId);
      await db.query(
        `UPDATE categories SET ${sets.join(', ')}
          WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
        values,
      );
    }
  }

  const updated = await findVisibleCategory(db, userId, id);
  return sendSuccess(res, serialize.category(updated), 'Category updated');
});

/**
 * Deleting a custom category never loses data: its expenses, fixed expenses
 * and recurring rules are moved to the default "Other" category first.
 */
const remove = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await findVisibleCategory(db, userId, id);
  if (!existing) throw ApiError.notFound('Category not found');
  if (existing.is_default) throw ApiError.forbidden('Default categories cannot be deleted.');

  const reassigned = await db.withTransaction(async (client) => {
    const otherId = await getOtherCategoryId(client);
    const moved = await client.query(
      'UPDATE expenses SET category_id = $1 WHERE user_id = $2 AND category_id = $3',
      [otherId, userId, id],
    );
    await client.query(
      'UPDATE fixed_expenses SET category_id = $1 WHERE user_id = $2 AND category_id = $3',
      [otherId, userId, id],
    );
    await client.query(
      'UPDATE recurring_expenses SET category_id = $1 WHERE user_id = $2 AND category_id = $3',
      [otherId, userId, id],
    );
    await client.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    return moved.rowCount;
  });

  return sendSuccess(
    res,
    { reassigned_expenses: reassigned },
    reassigned > 0
      ? `Category deleted. ${reassigned} expense(s) moved to "Other".`
      : 'Category deleted.',
  );
});

module.exports = { list, create, update, remove, assertCategoryAccessible, findVisibleCategory };
