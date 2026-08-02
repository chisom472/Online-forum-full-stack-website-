/**
 * auth.js
 * Wires up the login and register forms. Only one of these forms will
 * exist on any given page, so each handler checks for its element first.
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // If already logged in, bounce away from auth pages
  if (Auth.isLoggedIn() && (loginForm || registerForm)) {
    location.href = 'index.html';
  }
});

function showFormError(message) {
  const el = document.getElementById('form-error');
  el.textContent = message;
  el.style.display = 'block';
}

async function handleLogin(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in…';

  try {
    const { token, user } = await Api.login({
      emailOrUsername: document.getElementById('emailOrUsername').value.trim(),
      password: document.getElementById('password').value,
    });
    Auth.setSession(token, user);
    const next = getQueryParam('next');
    location.href = next || 'index.html';
  } catch (err) {
    showFormError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const { token, user } = await Api.register({
      display_name: document.getElementById('display_name').value.trim(),
      username: document.getElementById('username').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    });
    Auth.setSession(token, user);
    location.href = 'index.html';
  } catch (err) {
    showFormError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
}
