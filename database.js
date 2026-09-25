/**
 * database.js
 * Sets up the SQLite database connection and creates all tables the first
 * time the server runs. Uses better-sqlite3 - synchronous, fast, and simple,
 * which is a good fit for a forum/blog workload that is read-heavy.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'digitalenviro.sqlite');

// Make sure the folder that will hold the database file exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
// --- Migration: add password-reset columns if they don't already exist ---
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes('reset_token_hash')) {
  db.exec('ALTER TABLE users ADD COLUMN reset_token_hash TEXT');
}
if (!userColumns.includes('reset_token_expires')) {
  db.exec('ALTER TABLE users ADD COLUMN reset_token_expires TEXT');
}
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT DEFAULT '/assets/icon-96.png',
  bio           TEXT DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'member', -- member | moderator | admin
  reputation    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'forum', -- 'forum' | 'blog' | 'both'
  icon        TEXT DEFAULT '💻',
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type          TEXT NOT NULL DEFAULT 'forum', -- 'forum' (discussion thread) | 'blog' (article)
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  excerpt       TEXT DEFAULT '',
  content       TEXT NOT NULL,
  cover_image   TEXT DEFAULT '',
  tags          TEXT DEFAULT '', -- comma separated
  status        TEXT NOT NULL DEFAULT 'published', -- draft | published
  is_pinned     INTEGER NOT NULL DEFAULT 0,
  is_locked     INTEGER NOT NULL DEFAULT 0,
  views         INTEGER NOT NULL DEFAULT 0,
  meta_title       TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_solution INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_likes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comment_likes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
`);

// ---------------------------------------------------------------------------
// Seed default categories if the table is empty
// ---------------------------------------------------------------------------
const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;

if (categoryCount === 0) {
  const insert = db.prepare(`
    INSERT INTO categories (name, slug, description, type, icon, sort_order)
    VALUES (@name, @slug, @description, @type, @icon, @sort_order)
  `);

  const defaults = [
    { name: 'Coding & Programming', slug: 'coding', description: 'General programming, algorithms, languages, and debugging help.', type: 'both', icon: '👨‍💻', sort_order: 1 },
    { name: 'AI Development', slug: 'ai-development', description: 'Building with LLMs, machine learning, model training and AI tooling.', type: 'both', icon: '🤖', sort_order: 2 },
    { name: 'Prompt Engineering', slug: 'prompt-engineering', description: 'Techniques, patterns and case studies for getting the most out of AI models.', type: 'both', icon: '🧠', sort_order: 3 },
    { name: 'Web Development', slug: 'web-development', description: 'Frontend, backend, frameworks, and full-stack web engineering.', type: 'both', icon: '🌐', sort_order: 4 },
    { name: 'Mobile Development', slug: 'mobile-development', description: 'iOS, Android, React Native, Flutter and cross-platform mobile apps.', type: 'both', icon: '📱', sort_order: 5 },
    { name: 'Desktop Development', slug: 'desktop-development', description: 'Electron, native desktop apps, and cross-platform desktop tooling.', type: 'both', icon: '🖥️', sort_order: 6 },
    { name: 'Career & Community', slug: 'career-community', description: 'Career advice, industry news, and general developer discussion.', type: 'both', icon: '💬', sort_order: 7 },
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(defaults);
  console.log('[db] Seeded default categories.');
}

module.exports = db;
