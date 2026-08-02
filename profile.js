/**
 * profile.js
 * Loads a public profile by ?u=<username> and lists their recent posts.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const username = getQueryParam('u');
  const container = document.getElementById('profile-container');

  if (!username) {
    container.innerHTML = `<div class="empty-state">No profile specified.</div>`;
    return;
  }

  try {
    const { user, posts, stats } = await Api.getUserProfile(username);
    document.getElementById('page-title').textContent = `${user.display_name} — Digital Enviro`;

    container.innerHTML = `
      <div style="display:flex; gap:20px; align-items:center; margin-bottom:32px;">
        <img src="${user.avatar_url}" alt="" style="width:84px; height:84px; border-radius:50%; object-fit:cover;">
        <div>
          <h1 style="font-size:1.6rem; margin-bottom:4px;">${escapeHtml(user.display_name)}</h1>
          <p style="margin-bottom:6px;">@${escapeHtml(user.username)} ${user.role !== 'member' ? `&middot; <span style="color:var(--leaf-deep); font-weight:600;">${user.role}</span>` : ''}</p>
          ${user.bio ? `<p style="font-size:0.92rem;">${escapeHtml(user.bio)}</p>` : ''}
        </div>
      </div>

      <div style="display:flex; gap:28px; margin-bottom:32px;">
        <div class="stat"><b style="color:var(--navy-ink); font-family:var(--font-display); font-size:1.4rem;">${stats.thread_count}</b><span style="color:var(--ink-muted); font-size:0.82rem;">Discussions</span></div>
        <div class="stat"><b style="color:var(--navy-ink); font-family:var(--font-display); font-size:1.4rem;">${stats.article_count}</b><span style="color:var(--ink-muted); font-size:0.82rem;">Articles</span></div>
        <div class="stat"><b style="color:var(--navy-ink); font-family:var(--font-display); font-size:1.4rem;">${stats.comment_count}</b><span style="color:var(--ink-muted); font-size:0.82rem;">Replies</span></div>
      </div>

      <div class="vine"><span class="vine-leaf">🌿</span><span class="vine-label">Recent activity</span><span></span></div>

      <div class="post-list">
        ${posts.length ? posts.map(profilePostHtml).join('') : `<div class="empty-state">No posts yet.</div>`}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state">This profile couldn't be found.</div>`;
  }
});

function profilePostHtml(p) {
  const link = p.type === 'blog' ? `blog-post.html?slug=${p.slug}` : `thread.html?slug=${p.slug}`;
  return `
    <article class="post-card">
      <div class="post-body">
        <div class="post-meta">
          <span class="cat-pill">${p.type === 'blog' ? '📝' : '💬'} ${escapeHtml(p.category_name)}</span>
          <span>&middot; ${timeAgo(p.created_at)}</span>
        </div>
        <div class="post-title"><a href="${link}">${escapeHtml(p.title)}</a></div>
        <div class="post-stats"><span>👁 ${p.views} views</span></div>
      </div>
    </article>`;
}
