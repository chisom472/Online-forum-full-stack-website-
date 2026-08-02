/**
 * blog.js
 * Drives the blog listing page: category dropdown, search, and pagination
 * over posts of type "blog".
 */

const blogState = {
  category: getQueryParam('category') || '',
  q: getQueryParam('q') || '',
  page: 1,
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-input').value = blogState.q;
  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      blogState.q = e.target.value.trim();
      blogState.page = 1;
      loadArticles();
    }
  });

  loadCategoryFilter();
  loadArticles();
});

async function loadCategoryFilter() {
  const select = document.getElementById('category-select');
  try {
    const { categories } = await Api.getCategories();
    select.innerHTML =
      `<option value="">All categories</option>` +
      categories.map((c) => `<option value="${c.slug}" ${blogState.category === c.slug ? 'selected' : ''}>${c.icon} ${escapeHtml(c.name)}</option>`).join('');
    select.addEventListener('change', () => {
      blogState.category = select.value;
      blogState.page = 1;
      loadArticles();
    });
  } catch (err) {
    /* silently ignore - filter is a nice-to-have */
  }
}

async function loadArticles() {
  const grid = document.getElementById('article-grid');
  grid.innerHTML = `<div class="skeleton" style="height:220px;"></div>`;

  try {
    const { posts, pagination } = await Api.getPosts({
      type: 'blog',
      category: blogState.category || undefined,
      q: blogState.q || undefined,
      page: blogState.page,
      limit: 9,
    });

    if (!posts.length) {
      grid.innerHTML = `<div class="empty-state"><span class="vine-leaf">📝</span>No articles found. <a href="create-post.html?type=blog">Write the first one</a>.</div>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    grid.innerHTML = posts.map(articleCardHtml).join('');
    renderBlogPagination(pagination);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Something went wrong loading articles.</div>`;
  }
}

function articleCardHtml(p) {
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
        <span>💬 ${p.comment_count}</span>
      </div>
    </article>`;
}

function renderBlogPagination({ page, pages }) {
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
      blogState.page = parseInt(btn.dataset.page, 10);
      loadArticles();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
