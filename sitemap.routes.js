/**
 * sitemap.routes.js
 * Generates sitemap.xml on the fly from published posts and categories so
 * search engines always see an up-to-date list of URLs without a manual
 * rebuild step.
 */

const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/sitemap.xml', (req, res) => {
  const siteUrl = (process.env.SITE_URL || 'https://digitalenviro.com').replace(/\/$/, '');

  const staticPages = ['/', '/forum.html', '/blog.html', '/about.html', '/downloads.html'];

  const categories = db.prepare('SELECT slug FROM categories').all();
  const posts = db
    .prepare("SELECT slug, updated_at, type FROM posts WHERE status = 'published' ORDER BY updated_at DESC")
    .all();

  const urls = [
    ...staticPages.map((p) => ({ loc: `${siteUrl}${p}`, priority: p === '/' ? '1.0' : '0.7' })),
    ...categories.map((c) => ({ loc: `${siteUrl}/forum.html?category=${c.slug}`, priority: '0.6' })),
    ...posts.map((p) => ({
      loc: `${siteUrl}/${p.type === 'blog' ? 'blog-post' : 'thread'}.html?slug=${p.slug}`,
      lastmod: p.updated_at,
      priority: '0.8',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod.split(' ')[0]}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
});

module.exports = router;
