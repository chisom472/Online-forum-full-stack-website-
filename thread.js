/**
 * thread.js
 * Loads a single forum thread by its slug (?slug=...), renders the original
 * post, then loads and renders comments as a lightly nested list using the
 * .thread-rail "vine" style for replies. Handles liking, replying, deleting,
 * and marking a reply as the accepted solution.
 */

let currentPost = null;

document.addEventListener('DOMContentLoaded', async () => {
  const slug = getQueryParam('slug');
  if (!slug) {
    renderNotFound();
    return;
  }
  await loadThread(slug);
});

async function loadThread(slug) {
  const container = document.getElementById('thread-container');
  try {
    const { post, like_count, liked_by_me } = await Api.getPost(slug);
    currentPost = post;

    document.getElementById('page-title').textContent = `${post.title} — Digital Enviro Forum`;
    document.getElementById('meta-description').setAttribute('content', post.meta_description || post.excerpt);

    container.innerHTML = threadHeaderHtml(post, like_count, liked_by_me);
    wirePostActions(post);

    const commentsSection = document.createElement('div');
    commentsSection.id = 'comments-section';
    commentsSection.innerHTML = `<div class="skeleton" style="height:80px;"></div>`;
    container.appendChild(commentsSection);

    await loadComments(post.id);
  } catch (err) {
    renderNotFound();
  }
}

function threadHeaderHtml(post, likeCount, likedByMe) {
  const user = Auth.getUser();
  const isOwner = user && user.id === post.user_id;
  const isStaff = user && ['moderator', 'admin'].includes(user.role);

  return `
    <div class="post-detail-head">
      <div class="post-meta">
        <span class="cat-pill">${post.category_icon} ${escapeHtml(post.category_name)}</span>
        ${post.is_pinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
        ${post.is_locked ? '<span class="lock-badge">🔒 Locked</span>' : ''}
      </div>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-meta">
        <img class="post-avatar" style="width:26px;height:26px;" src="${post.avatar_url}" alt="">
        <a href="profile.html?u=${post.username}"><b>${escapeHtml(post.display_name)}</b></a>
        <span>&middot; ${timeAgo(post.created_at)}</span>
        <span>&middot; 👁 ${post.views} views</span>
      </div>
    </div>
    <div class="post-detail-body">${post.content}</div>
    ${post.tags.length ? `<div style="margin-top:16px;">${post.tags.map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    <div class="post-actions">
      <button class="like-btn ${likedByMe ? 'liked' : ''}" id="like-btn">❤️ <span id="like-count">${likeCount}</span></button>
      ${isOwner || isStaff ? `<a href="create-post.html?edit=${post.id}" class="btn btn-outline btn-sm">Edit</a>` : ''}
      ${isOwner || isStaff ? `<button class="btn btn-outline btn-sm" id="delete-post-btn">Delete</button>` : ''}
    </div>
    <div class="vine"><span class="vine-leaf">💬</span><span class="vine-label">Replies</span><span></span></div>
  `;
}

function wirePostActions(post) {
  document.getElementById('like-btn').addEventListener('click', async () => {
    if (!requireLogin('Please log in to like this post.')) return;
    const { liked, like_count } = await Api.likePost(post.id);
    document.getElementById('like-count').textContent = like_count;
    document.getElementById('like-btn').classList.toggle('liked', liked);
  });

  const deleteBtn = document.getElementById('delete-post-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this post permanently? This cannot be undone.')) return;
      try {
        await Api.deletePost(post.id);
        location.href = 'forum.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

async function loadComments(postId) {
  const section = document.getElementById('comments-section');
  try {
    const { comments } = await Api.getComments(postId);
    const topLevel = comments.filter((c) => !c.parent_id);
    const byParent = comments.reduce((acc, c) => {
      if (c.parent_id) (acc[c.parent_id] ||= []).push(c);
      return acc;
    }, {});

    section.innerHTML = `
      <div id="comment-list">
        ${topLevel.length ? topLevel.map((c) => commentHtml(c, byParent[c.id] || [])).join('') : `<div class="empty-state"><span class="vine-leaf">🌱</span>No replies yet. Be the first to help.</div>`}
      </div>
      ${replyFormHtml()}
    `;

    wireCommentActions();
    wireReplyForm(postId);
  } catch (err) {
    section.innerHTML = `<div class="empty-state">Couldn't load replies.</div>`;
  }
}

function commentHtml(c, replies) {
  return `
    <div class="comment" data-id="${c.id}">
      <div class="comment-head">
        <img src="${c.avatar_url}" alt="">
        <b>${escapeHtml(c.display_name)}</b>
        ${c.is_solution ? '<span class="solution-tag">✓ Solution</span>' : ''}
        <span>&middot; ${timeAgo(c.created_at)}</span>
      </div>
      <p style="color:var(--ink-text); margin-bottom:6px;">${escapeHtml(c.content)}</p>
      <div class="comment-actions">
        <button class="comment-like-btn" data-id="${c.id}">❤️ ${c.like_count}</button>
        <button class="comment-reply-btn" data-id="${c.id}" data-name="${escapeHtml(c.display_name)}">Reply</button>
        ${canModerate(c) ? `<button class="comment-delete-btn" data-id="${c.id}">Delete</button>` : ''}
        ${canMarkSolution() ? `<button class="comment-solution-btn" data-id="${c.id}">Mark as solution</button>` : ''}
      </div>
      ${replies.length ? `<div class="thread-rail" style="margin-top:14px;">${replies.map((r) => commentHtml(r, [])).join('')}</div>` : ''}
    </div>
  `;
}

function canModerate(comment) {
  const user = Auth.getUser();
  if (!user) return false;
  return user.id === comment.user_id || ['moderator', 'admin'].includes(user.role);
}

function canMarkSolution() {
  const user = Auth.getUser();
  if (!user || !currentPost) return false;
  return user.id === currentPost.user_id || ['moderator', 'admin'].includes(user.role);
}

function replyFormHtml() {
  const user = Auth.getUser();
  if (currentPost && currentPost.is_locked) {
    return `<div class="empty-state">🔒 This thread is locked for new replies.</div>`;
  }
  if (!user) {
    return `<div class="empty-state">Please <a href="login.html">log in</a> to join the discussion.</div>`;
  }
  return `
    <div class="reply-box">
      <div class="field">
        <label for="reply-input">Add a reply</label>
        <textarea id="reply-input" style="font-family:var(--font-body); min-height:100px;" placeholder="Share your thoughts or a solution…"></textarea>
      </div>
      <input type="hidden" id="reply-parent-id" value="">
      <div id="reply-context" style="font-size:0.8rem; color:var(--ink-muted); margin-bottom:10px; display:none;"></div>
      <button class="btn btn-primary" id="submit-reply-btn">Post reply</button>
    </div>
  `;
}

function wireReplyForm(postId) {
  const submitBtn = document.getElementById('submit-reply-btn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async () => {
    const textarea = document.getElementById('reply-input');
    const content = textarea.value.trim();
    if (!content) return;

    const parentId = document.getElementById('reply-parent-id').value || null;
    submitBtn.disabled = true;
    try {
      await Api.addComment(postId, { content, parent_id: parentId });
      await loadComments(postId);
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function wireCommentActions() {
  document.querySelectorAll('.comment-like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!requireLogin('Please log in to like a reply.')) return;
      const { like_count } = await Api.likeComment(btn.dataset.id);
      btn.textContent = `❤️ ${like_count}`;
    });
  });

  document.querySelectorAll('.comment-reply-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!requireLogin('Please log in to reply.')) return;
      document.getElementById('reply-parent-id').value = btn.dataset.id;
      const ctx = document.getElementById('reply-context');
      ctx.style.display = 'block';
      ctx.innerHTML = `Replying to <b>${btn.dataset.name}</b> — <a href="#" id="cancel-reply-ctx">cancel</a>`;
      document.getElementById('cancel-reply-ctx').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('reply-parent-id').value = '';
        ctx.style.display = 'none';
      });
      document.getElementById('reply-input').focus();
    });
  });

  document.querySelectorAll('.comment-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this reply?')) return;
      await Api.deleteComment(btn.dataset.id);
      await loadComments(currentPost.id);
    });
  });

  document.querySelectorAll('.comment-solution-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await Api.markSolution(btn.dataset.id);
      await loadComments(currentPost.id);
    });
  });
}

function renderNotFound() {
  document.getElementById('thread-container').innerHTML = `
    <div class="empty-state">
      <span class="vine-leaf">🥀</span>
      This discussion doesn't exist or may have been removed.
      <br><br><a href="forum.html" class="btn btn-outline">Back to forum</a>
    </div>`;
}
