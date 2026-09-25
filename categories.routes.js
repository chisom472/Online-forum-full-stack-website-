/**
 * categories.routes.js
 * Read-only listing of forum/blog categories, plus per-category post counts.
 */

const express = require('express');
const db = require('./database');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = 'published') AS post_count
       FROM categories c
       ORDER BY c.sort_order ASC`
    )
    .all();
  res.json({ categories: rows });
});

router.get('/:slug', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!category) return res.status(404).json({ error: 'Category not found.' });
  res.json({ category });
});

module.exports = router;
