/**
 * auth.routes.js
 * Registration, login, and "who am I" endpoints.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const { requireAuth } = require('./middleware/auth.middleware');
const router = express.Router();

// Slow down brute-force attempts on auth endpoints specifically
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/register', authLimiter, (req, res) => {
  const { username, email, password, display_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are all required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscores only.' });
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
    .get(email.toLowerCase(), username);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email or username already exists.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(`INSERT INTO users (username, email, password_hash, display_name)
              VALUES (?, ?, ?, ?)`)
    .run(username, email.toLowerCase(), password_hash, display_name || username);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', authLimiter, (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Please enter your email/username and password.' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE email = ? OR username = ?')
    .get(emailOrUsername.toLowerCase(), emailOrUsername);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email/username or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Account no longer exists.' });
  res.json({ user: publicUser(user) });
});

router.put('/me', requireAuth, (req, res) => {
  const { display_name, bio, avatar_url } = req.body;
  db.prepare(`UPDATE users SET display_name = COALESCE(?, display_name),
              bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url) WHERE id = ?`)
    .run(display_name, bio, avatar_url, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

module.exports = router;
