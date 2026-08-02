/**
 * main.js
 * Shared behavior loaded on every page: mobile nav toggle, header auth state
 * (shows Login/Register vs. the user's avatar), logout handling, and a few
 * small formatting helpers reused across forum.js, blog.js, thread.js, etc.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  renderAuthState();
  highlightActiveNavLink();
});

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
}

function highlightActiveNavLink() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });
}

function renderAuthState() {
  const slot = document.querySelector('#nav-auth-slot');
  if (!slot) return;

  const user = Auth.getUser();
  if (!user) {
    slot.innerHTML = `
      <a href="login.html" class="btn btn-outline-light btn-sm">Log in</a>
      <a href="register.html" class="btn btn-primary btn-sm">Join free</a>
    `;
    return;
  }

  slot.innerHTML = `
    <a href="create-post.html" class="btn btn-primary btn-sm">New post</a>
    <a href="profile.html?u=${encodeURIComponent(user.username)}" class="user-chip">
      <img src="${user.avatar_url || 'assets/icon-96.png'}" alt="">
      ${escapeHtml(user.display_name)}
    </a>
    <button id="logout-btn" class="btn btn-outline-light btn-sm">Log out</button>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.clearSession();
    location.href = 'index.html';
  });
}

/* ---------------------------------------------------------------------- */
/* Small shared helpers                                                    */
/* ---------------------------------------------------------------------- */

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(isoLike) {
  const then = new Date(isoLike.replace(' ', 'T') + 'Z').getTime();
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));

  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [label, secs] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value} ${label}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

function requireLogin(redirectMessage = 'Please log in to continue.') {
  if (!Auth.isLoggedIn()) {
    alert(redirectMessage);
    location.href = `login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    return false;
  }
  return true;
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function categoryIconTag(icon) {
  return `<span class="cat-icon-inline">${icon || '💻'}</span>`;
}
