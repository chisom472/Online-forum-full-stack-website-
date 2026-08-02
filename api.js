/**
 * api.js
 * Thin wrapper around fetch() for talking to the Digital Enviro backend.
 * Automatically attaches the saved JWT (if any) and throws a readable
 * Error with the server's message on non-2xx responses.
 */

const API_BASE = '/api';

const Auth = {
  getToken() {
    return localStorage.getItem('de_token');
  },
  getUser() {
    const raw = localStorage.getItem('de_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('de_token', token);
    localStorage.setItem('de_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('de_token');
    localStorage.removeItem('de_user');
  },
  isLoggedIn() {
    return !!Auth.getToken();
  },
};

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Auth.getToken()) {
    headers.Authorization = `Bearer ${Auth.getToken()}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* no JSON body */
  }

  if (!res.ok) {
    const message = data && data.error ? data.error : `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

const Api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiRequest('/auth/me'),
  updateMe: (payload) => apiRequest('/auth/me', { method: 'PUT', body: payload }),

  getCategories: () => apiRequest('/categories', { auth: false }),
  getCategory: (slug) => apiRequest(`/categories/${slug}`, { auth: false }),

  getPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/posts${qs ? `?${qs}` : ''}`, { auth: false });
  },
  getPost: (slug) => apiRequest(`/posts/${slug}`, { auth: false }),
  createPost: (payload) => apiRequest('/posts', { method: 'POST', body: payload }),
  updatePost: (id, payload) => apiRequest(`/posts/${id}`, { method: 'PUT', body: payload }),
  deletePost: (id) => apiRequest(`/posts/${id}`, { method: 'DELETE' }),
  likePost: (id) => apiRequest(`/posts/${id}/like`, { method: 'POST' }),

  getComments: (postId) => apiRequest(`/posts/${postId}/comments`, { auth: false }),
  addComment: (postId, payload) => apiRequest(`/posts/${postId}/comments`, { method: 'POST', body: payload }),
  deleteComment: (id) => apiRequest(`/comments/${id}`, { method: 'DELETE' }),
  likeComment: (id) => apiRequest(`/comments/${id}/like`, { method: 'POST' }),
  markSolution: (id) => apiRequest(`/comments/${id}/mark-solution`, { method: 'POST' }),

  getUserProfile: (username) => apiRequest(`/users/${username}`, { auth: false }),
  getReleases: () => apiRequest('/downloads', { auth: false }),
};
