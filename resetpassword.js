/**
 * reset-password.js
 * Reads the ?token= from the URL (the link sent via forgot-password) and
 * submits it along with the new password to /api/auth/reset-password.
 */

document.addEventListener('DOMContentLoaded', () => {
  const token = getQueryParam('token');
  if (!token) {
    document.getElementById('form-error').textContent = 'This reset link is missing its token. Please request a new one from the "Forgot password?" page.';
    document.getElementById('form-error').style.display = 'block';
    document.getElementById('reset-form').style.display = 'none';
    return;
  }

  document.getElementById('reset-form').addEventListener('submit', (e) => handleReset(e, token));
});

async function handleReset(e, token) {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;

  if (password !== confirm) {
    errorEl.textContent = 'Those passwords don\'t match.';
    errorEl.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const { message } = await Api.resetPassword({ token, password });
    successEl.textContent = `${message} Redirecting to login…`;
    successEl.style.display = 'block';
    setTimeout(() => { location.href = 'login.html'; }, 1500);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Set new password';
  }
}
