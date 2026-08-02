# Digital Enviro

A full-stack forum and blogging platform for developers to learn and share
ideas on **coding, AI development, prompt engineering, web development,
mobile development, and desktop development** — plus native desktop and
mobile apps that load the same site, downloadable only from the website
itself.

Brand: dark navy + leaf green, echoing the "D" + leaf mark in the logo.
Tagline: *Technology. Innovation. Sustainability.*

---

## Project structure

```
digital-enviro/
├── server/                  Express + SQLite backend (the API)
│   ├── db/
│   │   ├── database.js      Schema + auto-seeded categories
│   │   └── seed.js          Optional demo admin user + sample posts
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── posts.routes.js
│   │   ├── comments.routes.js
│   │   ├── categories.routes.js
│   │   ├── users.routes.js
│   │   ├── downloads.routes.js
│   │   └── sitemap.routes.js
│   └── server.js            Entry point
│
├── public/                  Static frontend (plain HTML/CSS/JS, no framework)
│   ├── index.html, forum.html, blog.html, thread.html, blog-post.html,
│   │   login.html, register.html, create-post.html, profile.html,
│   │   downloads.html, about.html
│   ├── css/style.css        Full design system
│   ├── js/                  api.js, main.js, auth.js, forum.js, blog.js,
│   │                        thread.js, blog-post.js, create-post.js,
│   │                        profile.js, downloads.js, home.js
│   ├── assets/               Logo + generated app icons
│   ├── manifest.json         PWA manifest
│   └── robots.txt
│
├── desktop-app/              Electron shell (Windows/macOS/Linux)
│   ├── main.js, preload.js, package.json
│   └── README.md             Build & packaging instructions
│
├── mobile-app/                Capacitor shell (Android/iOS)
│   ├── capacitor.config.json, package.json, www/index.html
│   └── README.md             Build & packaging instructions
│
├── package.json               Backend dependencies
└── .env.example                Copy to .env and fill in real values
```

---

## Running the website locally

Requires Node.js 18+.

```bash
npm install
cp .env.example .env
# edit .env - at minimum set a real JWT_SECRET

npm run seed   # optional: creates a demo admin account + sample posts
npm start      # starts the server at http://localhost:4000
```

Open `http://localhost:4000` in a browser. The frontend (in `/public`) is
served automatically by the same Express server, and calls the API at
`/api/...`.

Demo login after seeding: `admin@digitalenviro.com` / `ChangeMe123!`

### Development mode (auto-restart on file changes)

```bash
npm run dev
```

---

## How the site is organized

- **Forum vs. Blog** share one `posts` table (`type` = `forum` or `blog`),
  so search, tagging, and categories work identically across both — a
  forum thread is a Q&A-style discussion; a blog post is a long-form
  article. Both live under the same six categories: Coding, AI Development,
  Prompt Engineering, Web Development, Mobile Development, Desktop
  Development (plus Career & Community).
- **Auth** is JWT-based. Tokens are stored in `localStorage` on the client
  and sent as `Authorization: Bearer <token>`.
- **Replies/comments** support one level of nesting (a reply to a reply),
  which is enough for the vast majority of real discussion threads.
  A thread's original poster (or a moderator/admin) can mark a reply as
  the accepted **solution**.
- **Likes** are tracked per-user on both posts and comments (toggle
  on/off, one like per user).

## SEO built in

- Per-page `<title>`/`<meta description>`, Open Graph tags, canonical URLs
- `Organization` and `Article` JSON-LD structured data
- Dynamically generated `/sitemap.xml` (pulls every published post + category
  live from the database — never goes stale)
- `robots.txt` pointing at the sitemap and disallowing the post-composer
  and API routes
- Semantic HTML headings and descriptive link text throughout

## Desktop & mobile apps

Both apps are thin native shells that load the live website
(`https://digitalenviro.com`) rather than duplicating the UI in a second
codebase — see `desktop-app/README.md` and `mobile-app/README.md` for full
build instructions. The `/downloads.html` page on the website is the single
place these are distributed from (versions are served from
`/api/downloads`, backed by `server/routes/downloads.routes.js`) — they are
intentionally **not** published to the Microsoft Store, Mac App Store, or
Google Play, keeping distribution exclusive to the site itself. (The iOS
build is the one exception in the sample config, since Apple requires App
Store distribution for most iOS apps; adjust this if you use a different
distribution method such as TestFlight or an enterprise certificate.)

## Before going to production

1. Set a strong, random `JWT_SECRET` in `.env`.
2. Put the app behind HTTPS (a reverse proxy like Nginx or Caddy, or a
   platform that terminates TLS for you).
3. Update `SITE_URL` in `.env` and the canonical URLs in the HTML/JSON-LD
   if you're not using `digitalenviro.com`.
4. Move file uploads (cover images, avatars) to persistent object storage
   if you add real image uploading — the current schema stores image
   URLs as plain text fields, so any hosting works as long as it returns a
   stable URL.
5. Back up `server/db/digitalenviro.sqlite` regularly, or migrate to a
   managed Postgres/MySQL instance if you expect heavy concurrent write
   traffic (SQLite comfortably handles a read-heavy forum/blog at
   small-to-medium scale).
