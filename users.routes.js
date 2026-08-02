/**
 * users.routes.js
 * Public-facing profile pages: a user's info plus their recent posts.
 */

const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/:username', (req, res) => {
  const user = db
    .prepare('SELECT id, username, display_name, avatar_url, bio, role, reputation, created_at FROM users WHERE username = ?')
    .get(req.params.username);

  if (!user) return res.status(404).json({ error: 'User not found.' });

  const posts = db
    .prepare(
      `SELECT p.id, p.title, p.slug, p.type, p.created_at, p.views,
              c.name AS category_name, c.slug AS category_slug
       FROM posts p JOIN categories c ON c.id = p.category_id
       WHERE p.user_id = ? AND p.status = 'published'
       ORDER BY p.created_at DESC LIMIT 20`
    )
    .all(user.id);

  const stats = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM posts WHERE user_id = ? AND type = 'forum') AS thread_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = ? AND type = 'blog') AS article_count,
        (SELECT COUNT(*) FROM comments WHERE user_id = ?) AS comment_count`
    )
    .get(user.id, user.id, user.id);

  res.json({ user, posts, stats });
});

module.exports = router;
