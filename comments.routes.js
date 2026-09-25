/**
 * comments.routes.js
 * Comments/replies attached to a post. Supports one level of nesting via
 * parent_id (a reply to a reply), which covers the vast majority of forum
 * and blog discussion threads without the complexity of deep trees.
 */

const express = require('express');
const db = require('./database');
const { requireAuth } = require('./auth.middleware');

const router = express.Router();

// GET /api/posts/:postId/comments
router.get('/posts/:postId/comments', (req, res) => {
  const rows = db
    .prepare(
      `SELECT cm.*, u.username, u.display_name, u.avatar_url,
              (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = cm.id) AS like_count
       FROM comments cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.post_id = ?
       ORDER BY cm.created_at ASC`
    )
    .all(req.params.postId);

  res.json({ comments: rows });
});

// POST /api/posts/:postId/comments
router.post('/posts/:postId/comments', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.is_locked) return res.status(403).json({ error: 'This thread is locked for new replies.' });

  const { content, parent_id } = req.body;
  if (!content || content.trim().length < 1) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  const info = db
    .prepare('INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)')
    .run(req.params.postId, req.user.id, parent_id || null, content.trim());

  const comment = db
    .prepare(
      `SELECT cm.*, u.username, u.display_name, u.avatar_url
       FROM comments cm JOIN users u ON u.id = cm.user_id WHERE cm.id = ?`
    )
    .get(info.lastInsertRowid);

  res.status(201).json({ comment });
});

// DELETE /api/comments/:id
router.delete('/comments/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const isOwner = comment.user_id === req.user.id;
  const isStaff = ['moderator', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/comments/:id/like
router.post('/comments/:id/like', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const existing = db
    .prepare('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (existing) {
    db.prepare('DELETE FROM comment_likes WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
  }

  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM comment_likes WHERE comment_id = ?').get(req.params.id).c;
  res.json({ liked: !existing, like_count: likeCount });
});

// POST /api/comments/:id/mark-solution - thread author marks a reply as the solution
router.post('/comments/:id/mark-solution', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(comment.post_id);
  const isStaff = ['moderator', 'admin'].includes(req.user.role);
  if (post.user_id !== req.user.id && !isStaff) {
    return res.status(403).json({ error: 'Only the thread starter can mark a solution.' });
  }

  db.prepare('UPDATE comments SET is_solution = 0 WHERE post_id = ?').run(post.id);
  db.prepare('UPDATE comments SET is_solution = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
