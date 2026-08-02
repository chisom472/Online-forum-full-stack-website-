/**
 * downloads.js
 * Fetches current release metadata from /api/downloads and wires up the
 * platform buttons so version numbers and file links stay in sync with
 * whatever was actually built, instead of being hardcoded in the HTML.
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { desktop, mobile } = await Api.getReleases();

    document.getElementById('desktop-version').textContent = `Version ${desktop.version} · Released ${desktop.released}`;
    document.getElementById('dl-windows').href = desktop.windows;
    document.getElementById('dl-mac').href = desktop.mac;
    document.getElementById('dl-linux').href = desktop.linux;

    document.getElementById('mobile-version').textContent = `Version ${mobile.version} · Released ${mobile.released}`;
    document.getElementById('dl-android').href = mobile.android;
    document.getElementById('dl-ios').href = mobile.ios;
  } catch (err) {
    document.getElementById('desktop-version').textContent = 'Version info unavailable right now.';
    document.getElementById('mobile-version').textContent = 'Version info unavailable right now.';
  }
});
