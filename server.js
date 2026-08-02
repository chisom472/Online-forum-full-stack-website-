/**
 * server.js
 * Entry point for the Digital Enviro backend. Wires up middleware, mounts
 * every route module under /api, serves the static frontend from /public,
 * and starts the HTTP server.
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');
const commentsRoutes = require('./routes/comments.routes');
const categoriesRoutes = require('./routes/categories.routes');
const usersRoutes = require('./routes/users.routes');
const downloadsRoutes = require('./routes/downloads.routes');
const sitemapRoutes = require('./routes/sitemap.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
// Core middleware
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // relaxed for simplicity with inline demo scripts/styles
  })
);
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// General API rate limit - generous, just guards against abuse/scraping storms
app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---------------------------------------------------------------------------
// SEO: sitemap.xml is generated dynamically, mounted before static so it
// isn't shadowed by a stale file of the same name in /public
// ---------------------------------------------------------------------------
app.use('/', sitemapRoutes);

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api', commentsRoutes); // exposes /api/posts/:id/comments and /api/comments/:id

// ---------------------------------------------------------------------------
// Static frontend
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Anything else not matched by a static file falls back to the homepage
// so client-side query-param routing (e.g. thread.html?slug=...) still works
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Central error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log(`Digital Enviro server running at http://localhost:${PORT}`);
});
