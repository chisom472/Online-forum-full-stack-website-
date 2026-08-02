/**
 * blog-post.js
 * Loads a single blog article by slug, renders it with Article structured
 * data for SEO, and loads a flat (non-nested) comment thread underneath -
 * appropriate for article discussion, as opposed to the Q&A-style nesting
 * used on forum threads.
 */

let currentArticle = null;

document.addEventListener('DOMContentLoaded', async () => {
  const slug = getQueryParam('slug');
  if (!slug) return renderNotFound();
  await loadArticle(slug);
});

async function loadArticle(slug) {
  const container = document.getElementById('article-container');
  try {
    const { post, like_count, liked_by_me } = await Api.getPost(slug);
    currentArticle = post;

    document.title = `${post.title} — Digital Enviro Blog`;
    document.getElementById('meta-description').setAttribute('content', post.meta_description || post.excerpt);
    injectJsonLd(post);

    container.innerHTML = articleHeaderHtml(post, like_count, liked_by_me);
    wireArticleActions(post);

    const commentsSection = document.createElement('div');
    commentsSection.id = 'comments-section';
    commentsSection.innerHTML = `<div class="skeleton" style="height:80px;"></div>`;
    container.appendChild(commentsSection);

    await loadArticleComments(post.id);
  } catch (err) {
    renderNotFound();
  }
}

function injectJsonLd(post) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    author: { '@type': 'Person', name: post.display_name },
    datePublished: post.created_at,
    dateModified: post.updated_at,
    image: post.cover_image || 'https://digitalenviro.com/assets/logo-horizontal.png',
    publisher: { '@type': 'Organization', name: 'Digital Enviro' },
  };
  document.getElementById('article-jsonld').textContent = JSON.stringify(data);
}

function articleHeaderHtml(post, likeCount, likedByMe) {
  const user = Auth.getUser();
  const isOwner = user && user.id === post.user_id;
  const isStaff = user && ['moderator', 'admin'].includes(user.role);

  return `
    <div class="post-detail-head">
      <div class="post-meta">
        <span class="cat-pill">${post.category_icon} ${escapeHtml(post.category_name)}</span>
      </div>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-meta">
        <img class="post-avatar" style="width:26px;height:26px;" src="${post.avatar_url}" alt="">
        <a href="profile.html?u=${post.username}"><b>${escapeHtml(post.display_name)}</b></a>
        <span>&middot; ${timeAgo(post.created_at)}</span>
        <span>&middot; 👁 ${post.views} views</span>
      </div>
    </div>
    ${post.cover_image ? `<img class="cover" src="${post.cover_image}" alt="${escapeHtml(post.title)}" style="aspect-ratio:16/8; width:100%; object-fit:cover; border-radius:14px; margin-bottom:24px;">` : ''}
    <div class="post-detail-body">${post.content}</div>
    ${post.tags.length ? `<div style="margin-top:16px;">${post.tags.map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    <div class="post-actions">
      <button class="like-btn ${likedByMe ? 'liked' : ''}" id="like-btn">❤️ <span id="like-count">${likeCount}</span></button>
      ${isOwner || isStaff ? `<a href="create-post.html?edit=${post.id}" class="btn btn-outline btn-sm">Edit</a>` : ''}
      ${isOwner || isStaff ? `<button class="btn btn-outline btn-sm" id="delete-post-btn">Delete</button>` : ''}
    </div>
    <div class="vine"><span class="vine-leaf">💬</span><span class="vine-label">Discussion</span><span></span></div>
  `;
}

function wireArticleActions(post) {
  document.getElementById('like-btn').addEventListener('click', async () => {
    if (!requireLogin('Please log in to like this article.')) return;
    const { liked, like_count } = await Api.likePost(post.id);
    document.getElementById('like-count').textContent = like_count;
    document.getElementById('like-btn').classList.toggle('liked', liked);
  });

  const deleteBtn = document.getElementById('delete-post-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this article permanently?')) return;
      try {
        await Api.deletePost(post.id);
        location.href = 'blog.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

async function loadArticleComments(postId) {
  const section = document.getElementById('comments-section');
  try {
    const { comments } = await Api.getComments(postId);

    section.innerHTML = `
      <div id="comment-list">
        ${comments.length ? comments.map(articleCommentHtml).join('') : `<div class="empty-state"><span class="vine-leaf">🌱</span>No comments yet. Share your thoughts.</div>`}
      </div>
      ${articleReplyFormHtml()}
    `;

    wireArticleCommentActions();
    wireArticleReplyForm(postId);
  } catch (err) {
    section.innerHTML = `<div class="empty-state">Couldn't load comments.</div>`;
  }
}

function articleCommentHtml(c) {
  return `
    <div class="comment" data-id="${c.id}">
      <div class="comment-head">
        <img src="${c.avatar_url}" alt="">
        <b>${escapeHtml(c.display_name)}</b>
        <span>&middot; ${timeAgo(c.created_at)}</span>
      </div>
      <p style="color:var(--ink-text); margin-bottom:6px;">${escapeHtml(c.content)}</p>
      <div class="comment-actions">
        <button class="comment-like-btn" data-id="${c.id}">❤️ ${c.like_count}</button>
        ${canModerateArticleComment(c) ? `<button class="comment-delete-btn" data-id="${c.id}">Delete</button>` : ''}
      </div>
    </div>
  `;
}

function canModerateArticleComment(comment) {
  const user = Auth.getUser();
  if (!user) return false;
  return user.id === comment.user_id || ['moderator', 'admin'].includes(user.role);
}

function articleReplyFormHtml() {
  const user = Auth.getUser();
  if (!user) return `<div class="empty-state">Please <a href="login.html">log in</a> to leave a comment.</div>`;
  return `
    <div class="reply-box">
      <div class="field">
        <label for="reply-input">Add a comment</label>
        <textarea id="reply-input" style="font-family:var(--font-body); min-height:100px;" placeholder="What did you think?"></textarea>
      </div>
      <button class="btn btn-primary" id="submit-reply-btn">Post comment</button>
    </div>
  `;
}

function wireArticleReplyForm(postId) {
  const submitBtn = document.getElementById('submit-reply-btn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async () => {
    const textarea = document.getElementById('reply-input');
    const content = textarea.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    try {
      await Api.addComment(postId, { content });
      await loadArticleComments(postId);
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function wireArticleCommentActions() {
  document.querySelectorAll('.comment-like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!requireLogin('Please log in to like a comment.')) return;
      const { like_count } = await Api.likeComment(btn.dataset.id);
      btn.textContent = `❤️ ${like_count}`;
    });
  });

  document.querySelectorAll('.comment-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      await Api.deleteComment(btn.dataset.id);
      await loadArticleComments(currentArticle.id);
    });
  });
}

function renderNotFound() {
  document.getElementById('article-container').innerHTML = `
    <div class="empty-state">
      <span class="vine-leaf">🥀</span>
      This article doesn't exist or may have been removed.
      <br><br><a href="blog.html" class="btn btn-outline">Back to blog</a>
    </div>`;
}
