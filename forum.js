/**
 * forum.js
 * Drives the forum listing page: reads ?category= and ?q= from the URL,
 * renders the category sidebar, fetches/paginates threads, and wires up the
 * search box and sort dropdown to re-query without a full page reload.
 */

const state = {
  category: getQueryParam('category') || '',
  q: getQueryParam('q') || '',
  sort: 'latest',
  page: 1,
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-input').value = state.q;
  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      state.q = e.target.value.trim();
      state.page = 1;
      loadThreads();
    }
  });
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 1;
    loadThreads();
  });

  loadSidebarCategories();
  loadThreads();
});

async function loadSidebarCategories() {
  const el = document.getElementById('sidebar-categories');
  try {
    const { categories } = await Api.getCategories();
    el.innerHTML =
      `<a href="forum.html" class="sidebar-cat-link ${!state.category ? 'active' : ''}"><span>All categories</span></a>` +
      categories
        .map(
          (c) => `
        <a href="forum.html?category=${c.slug}" class="sidebar-cat-link ${state.category === c.slug ? 'active' : ''}">
          <span>${c.icon} ${escapeHtml(c.name)}</span>
          <span class="count">${c.post_count}</span>
        </a>`
        )
        .join('');
  } catch (err) {
    el.innerHTML = `<p style="font-size:0.85rem;">Couldn't load categories.</p>`;
  }
}

async function loadThreads() {
  const list = document.getElementById('thread-list');
  list.innerHTML = `<div class="skeleton" style="height:100px;"></div>`;

  try {
    const { posts, pagination } = await Api.getPosts({
      type: 'forum',
      category: state.category || undefined,
      q: state.q || undefined,
      sort: state.sort,
      page: state.page,
      limit: 10,
    });

    if (!posts.length) {
      list.innerHTML = `<div class="empty-state"><span class="vine-leaf">🌱</span>No discussions found. <a href="create-post.html?type=forum">Start the first one</a>.</div>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    list.innerHTML = posts.map(threadCardHtml).join('');
    renderPagination(pagination);
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Something went wrong loading discussions.</div>`;
  }
}

function threadCardHtml(p) {
  return `
    <article class="post-card">
      <img class="post-avatar" src="${p.avatar_url}" alt="">
      <div class="post-body">
        <div class="post-meta">
          <span class="cat-pill">${p.category_icon} ${escapeHtml(p.category_name)}</span>
          <span>by ${escapeHtml(p.display_name)}</span>
          <span>&middot; ${timeAgo(p.created_at)}</span>
          ${p.is_pinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
          ${p.is_locked ? '<span class="lock-badge">🔒 Locked</span>' : ''}
        </div>
        <div class="post-title"><a href="thread.html?slug=${p.slug}">${escapeHtml(p.title)}</a></div>
        <p class="post-excerpt">${escapeHtml(p.excerpt)}</p>
        <div class="post-stats">
          <span>💬 ${p.comment_count} replies</span>
          <span>❤️ ${p.like_count}</span>
          <span>👁 ${p.views} views</span>
        </div>
      </div>
    </article>`;
}

function renderPagination({ page, pages }) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = `<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">← Prev</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button ${page === pages ? 'disabled' : ''} data-page="${page + 1}">Next →</button>`;
  el.innerHTML = html;

  el.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.page = parseInt(btn.dataset.page, 10);
      loadThreads();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
