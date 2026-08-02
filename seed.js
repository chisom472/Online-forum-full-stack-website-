/**
 * seed.js
 * Optional helper: run `npm run seed` to create a demo admin user and a
 * handful of example forum/blog posts so the site isn't empty on first run.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const db = require('./database');

function upsertUser({ username, email, password, display_name, role }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(`INSERT INTO users (username, email, password_hash, display_name, role)
              VALUES (?, ?, ?, ?, ?)`)
    .run(username, email, password_hash, display_name, role);
  return info.lastInsertRowid;
}

const adminId = upsertUser({
  username: 'admin',
  email: 'admin@digitalenviro.com',
  password: 'ChangeMe123!',
  display_name: 'Digital Enviro Team',
  role: 'admin',
});

const demoAuthorId = upsertUser({
  username: 'ada_codes',
  email: 'ada@example.com',
  password: 'ChangeMe123!',
  display_name: 'Ada Rivers',
  role: 'member',
});

const categories = db.prepare('SELECT id, slug FROM categories').all();
const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

const samplePosts = [
  {
    type: 'blog',
    category: 'ai-development',
    title: 'Building Your First Retrieval-Augmented Generation Pipeline',
    excerpt: 'A practical walkthrough of chunking, embeddings, and grounding LLM answers in your own data.',
    content: `<p>Retrieval-Augmented Generation (RAG) lets a language model answer questions using your own documents instead of only what it learned during training.</p><h2>The core loop</h2><p>Split your source documents into chunks, embed each chunk into a vector, store the vectors in a database, and at query time retrieve the closest matches to feed into the model's context.</p><h2>Common pitfalls</h2><p>Chunking too large loses precision. Chunking too small loses context. Start around 300-500 tokens per chunk and tune from there based on your own evaluation set.</p>`,
    author: adminId,
  },
  {
    type: 'forum',
    category: 'prompt-engineering',
    title: 'What is your go-to structure for system prompts?',
    excerpt: 'Looking for patterns people actually use in production, not just toy examples.',
    content: `<p>I keep seeing different structures for system prompts: role first, then rules, then examples - or the reverse. What has actually worked well for you in a live product?</p>`,
    author: demoAuthorId,
  },
  {
    type: 'blog',
    category: 'web-development',
    title: 'Why We Moved From a Framework-Heavy Stack to Vanilla JS for Our Landing Pages',
    excerpt: 'Sometimes the fastest, most maintainable option is also the simplest one.',
    content: `<p>Our marketing pages didn't need client-side routing, global state, or a build pipeline. Dropping the framework cut our bundle size dramatically and made onboarding new contributors much easier.</p><h2>When this does NOT apply</h2><p>If you have complex client state or a large component library, a framework still earns its keep. Match the tool to the problem.</p>`,
    author: adminId,
  },
  {
    type: 'forum',
    category: 'mobile-development',
    title: 'React Native vs Flutter in 2026 - what would you pick for a new app?',
    excerpt: 'Weighing performance, hiring pool, and long-term maintenance.',
    content: `<p>Starting a new cross-platform app and torn between React Native and Flutter. Curious what people are seeing in production today around performance and developer experience.</p>`,
    author: demoAuthorId,
  },
  {
    type: 'blog',
    category: 'desktop-development',
    title: 'Shipping a Lightweight Electron App Without the Bloat',
    excerpt: 'Practical steps to keep your Electron download size and memory footprint under control.',
    content: `<p>Electron gets a reputation for being heavy, but most of that comes from unused dependencies and unoptimized packaging, not the framework itself.</p><h2>Quick wins</h2><p>Trim your node_modules with production-only installs, lazy-load rarely used windows, and use the built-in auto-updater instead of a custom one.</p>`,
    author: adminId,
  },
  {
    type: 'forum',
    category: 'coding',
    title: 'Best way to structure a large Node.js REST API?',
    excerpt: 'Routes, services, repositories - how do you organize a growing codebase?',
    content: `<p>My API has grown past 40 routes and it's starting to feel messy. What folder structure has scaled well for you long-term?</p>`,
    author: demoAuthorId,
  },
];

const insertPost = db.prepare(`
  INSERT INTO posts (user_id, category_id, type, title, slug, excerpt, content, meta_title, meta_description)
  VALUES (@user_id, @category_id, @type, @title, @slug, @excerpt, @content, @meta_title, @meta_description)
`);

for (const p of samplePosts) {
  const slug = slugify(p.title, { lower: true, strict: true });
  const already = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
  if (already) continue;
  insertPost.run({
    user_id: p.author,
    category_id: catBySlug[p.category],
    type: p.type,
    title: p.title,
    slug,
    excerpt: p.excerpt,
    content: p.content,
    meta_title: p.title,
    meta_description: p.excerpt,
  });
}

console.log('[seed] Done. Admin login: admin@digitalenviro.com / ChangeMe123!');
