/**
 * posts.routes.js
 * Handles both forum threads and blog articles - they share the same table,
 * distinguished by the `type` column ('forum' | 'blog'). This keeps search,
 * tagging, and category logic in one place instead of duplicating it.
 */

const express = require('express');
const slugify = require('slugify');
const db = require('../db/database');
const { requireAuth, attachUserIfPresent } = require('../middleware/auth.middleware');

const router = express.Router();

function serializePost(row) {
  if (!row) return null;
  return {
    ...row,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
    is_pinned: !!row.is_pinned,
    is_locked: !!row.is_locked,
  };
}

function uniqueSlug(title) {
  let base = slugify(title, { lower: true, strict: true }).slice(0, 80) || 'post';
  let slug = base;
  let i = 1;
  while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug)) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

/**
 * GET /api/posts
 * Query params: type (forum|blog), category (slug), q (search), tag,
 *                sort (latest|popular|top), page, limit
 */
router.get('/', (req, res) => {
  const { type, category, q, tag, sort = 'latest', page = 1, limit = 12 } = req.query;

  const where = ["p.status = 'published'"];
  const params = {};

  if (type) {
    where.push('p.type = @type');
    params.type = type;
  }
  if (category) {
    where.push('c.slug = @category');
    params.category = category;
  }
  if (q) {
    where.push('(p.title LIKE @q OR p.excerpt LIKE @q OR p.content LIKE @q)');
    params.q = `%${q}%`;
  }
  if (tag) {
    where.push("(',' || p.tags || ',') LIKE @tag");
    params.tag = `%,${tag},%`;
  }

  const orderBy =
    sort === 'popular' ? 'p.views DESC'
    : sort === 'top' ? 'like_count DESC'
    : 'p.is_pinned DESC, p.created_at DESC';

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  const offset = (pageNum - 1) * pageSize;

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
              (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       JOIN categories c ON c.id = p.category_id
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset });

  const total = db
    .prepare(
      `SELECT COUNT(*) AS count FROM posts p
       JOIN categories c ON c.id = p.category_id
       ${whereSql}`
    )
    .get(params).count;

  res.json({
    posts: rows.map(serializePost),
    pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
  });
});

// GET /api/posts/:slug - full post detail, increments view count
router.get('/:slug', attachUserIfPresent, (req, res) => {
  const post = db
    .prepare(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
       FROM posts p
       JOIN users u ON u.id = p.user_id
       JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ?`
    )
    .get(req.params.slug);

  if (!post) return res.status(404).json({ error: 'Post not found.' });

  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
  post.views += 1;

  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?').get(post.id).c;
  let likedByMe = false;
  if (req.user) {
    likedByMe = !!db
      .prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?')
      .get(post.id, req.user.id);
  }

  res.json({ post: serializePost(post), like_count: likeCount, liked_by_me: likedByMe });
});

// POST /api/posts - create a new forum thread or blog article
router.post('/', requireAuth, (req, res) => {
  const { type = 'forum', category_id, title, content, excerpt, tags, cover_image, meta_title, meta_description } = req.body;

  if (!['forum', 'blog'].includes(type)) {
    return res.status(400).json({ error: 'Post type must be "forum" or "blog".' });
  }
  if (!title || title.trim().length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters.' });
  }
  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: 'Content must be at least 10 characters.' });
  }
  const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
  if (!category) {
    return res.status(400).json({ error: 'Please choose a valid category.' });
  }

  const slug = uniqueSlug(title);
  const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

  const info = db
    .prepare(
      `INSERT INTO posts (user_id, category_id, type, title, slug, excerpt, content, tags, cover_image, meta_title, meta_description)
       VALUES (@user_id, @category_id, @type, @title, @slug, @excerpt, @content, @tags, @cover_image, @meta_title, @meta_description)`
    )
    .run({
      user_id: req.user.id,
      category_id,
      type,
      title: title.trim(),
      slug,
      excerpt: excerpt || content.replace(/<[^>]+>/g, '').slice(0, 160),
      content,
      tags: tagsStr,
      cover_image: cover_image || '',
      meta_title: meta_title || title.trim(),
      meta_description: meta_description || (excerpt || '').slice(0, 160),
    });

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ post: serializePost(post) });
});

// PUT /api/posts/:id - edit own post (or any post if moderator/admin)
router.put('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const isOwner = post.user_id === req.user.id;
  const isStaff = ['moderator', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ error: 'You can only edit your own posts.' });
  }

  const { title, content, excerpt, tags, cover_image, category_id, is_pinned, is_locked } = req.body;
  const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;

  db.prepare(
    `UPDATE posts SET
       title = COALESCE(?, title),
       content = COALESCE(?, content),
       excerpt = COALESCE(?, excerpt),
       tags = COALESCE(?, tags),
       cover_image = COALESCE(?, cover_image),
       category_id = COALESCE(?, category_id),
       is_pinned = COALESCE(?, is_pinned),
       is_locked = COALESCE(?, is_locked),
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title,
    content,
    excerpt,
    tagsStr,
    cover_image,
    category_id,
    isStaff && typeof is_pinned === 'boolean' ? (is_pinned ? 1 : 0) : null,
    isStaff && typeof is_locked === 'boolean' ? (is_locked ? 1 : 0) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  res.json({ post: serializePost(updated) });
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const isOwner = post.user_id === req.user.id;
  const isStaff = ['moderator', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/posts/:id/like - toggle a like on a post
router.post('/:id/like', requireAuth, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existing = db
    .prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
  }

  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?').get(req.params.id).c;
  res.json({ liked: !existing, like_count: likeCount });
});

module.exports = router;
