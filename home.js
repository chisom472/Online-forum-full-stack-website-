/**
 * home.js
 * Populates the homepage: category grid, latest forum threads, latest blog
 * articles, and the small stat counters in the hero.
 */

document.addEventListener('DOMContentLoaded', async () => {
  loadCategories();
  loadLatestForum();
  loadLatestBlog();
});

async function loadCategories() {
  const grid = document.getElementById('category-grid');
  try {
    const { categories } = await Api.getCategories();
    grid.innerHTML = categories
      .map(
        (c) => `
        <a href="forum.html?category=${c.slug}" class="cat-card">
          <span class="cat-icon">${c.icon}</span>
          <h3>${escapeHtml(c.name)}</h3>
          <p>${escapeHtml(c.description)}</p>
          <span class="cat-count">${c.post_count} post${c.post_count === 1 ? '' : 's'}</span>
        </a>`
      )
      .join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load categories right now.</div>`;
  }
}

async function loadLatestForum() {
  const list = document.getElementById('latest-forum-list');
  try {
    const { posts, pagination } = await Api.getPosts({ type: 'forum', limit: 4, sort: 'latest' });
    document.getElementById('stat-threads').textContent = pagination.total;

    if (!posts.length) {
      list.innerHTML = `<div class="empty-state"><span class="vine-leaf">🌱</span>No discussions yet — be the first to start one.</div>`;
      return;
    }

    list.innerHTML = posts.map(forumCardHtml).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load discussions right now.</div>`;
  }
}

async function loadLatestBlog() {
  const grid = document.getElementById('latest-blog-list');
  try {
    const { posts, pagination } = await Api.getPosts({ type: 'blog', limit: 3, sort: 'latest' });
    document.getElementById('stat-articles').textContent = pagination.total;

    if (!posts.length) {
      grid.innerHTML = `<div class="empty-state"><span class="vine-leaf">📝</span>No articles published yet.</div>`;
      return;
    }

    grid.innerHTML = posts.map(blogCardHtml).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load articles right now.</div>`;
  }
}

function forumCardHtml(p) {
  return `
    <article class="post-card">
      <img class="post-avatar" src="${p.avatar_url}" alt="">
      <div class="post-body">
        <div class="post-meta">
          <span class="cat-pill">${p.category_icon} ${escapeHtml(p.category_name)}</span>
          <span>by ${escapeHtml(p.display_name)}</span>
          <span>&middot; ${timeAgo(p.created_at)}</span>
          ${p.is_pinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
        </div>
        <div class="post-title"><a href="thread.html?slug=${p.slug}">${escapeHtml(p.title)}</a></div>
        <p class="post-excerpt">${escapeHtml(p.excerpt)}</p>
        <div class="post-stats">
          <span>💬 ${p.comment_count}</span>
          <span>❤️ ${p.like_count}</span>
          <span>👁 ${p.views}</span>
        </div>
      </div>
    </article>`;
}

function blogCardHtml(p) {
  return `
    <article class="post-card">
      <img class="cover" src="${p.cover_image || 'assets/icon-256.png'}" alt="">
      <div class="post-meta">
        <span class="cat-pill">${p.category_icon} ${escapeHtml(p.category_name)}</span>
        <span>&middot; ${timeAgo(p.created_at)}</span>
      </div>
      <div class="post-title"><a href="blog-post.html?slug=${p.slug}">${escapeHtml(p.title)}</a></div>
      <p class="post-excerpt">${escapeHtml(p.excerpt)}</p>
      <div class="post-stats">
        <span>by ${escapeHtml(p.display_name)}</span>
        <span>👁 ${p.views}</span>
      </div>
    </article>`;
}
