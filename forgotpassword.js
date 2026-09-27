/**
 * forgot-password.js
 * Submits the email to /api/auth/forgot-password. The server always replies
 * with the same success message whether or not that email exists, so this
 * page never reveals which emails are registered.
 */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('forgot-form').addEventListener('submit', handleForgot);
});

async function handleForgot(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const { message } = await Api.forgotPassword({ email: document.getElementById('email').value.trim() });
    successEl.textContent = message;
    successEl.style.display = 'block';
    document.getElementById('forgot-form').reset();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send reset link';
  }
}
