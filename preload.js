/**
 * preload.js (Electron preload script)
 * Runs in an isolated context before the web page loads. Exposes a small,
 * safe API on window.desktopApp so the website's own JS can detect it's
 * running inside the desktop app (e.g. to hide "Download the app" banners)
 * without giving the page direct access to Node.js or Electron internals.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktopApp: true,
  platform: process.platform,
  version: process.versions.electron,

  // Placeholder for future use: the renderer could call this when the user
  // opens a thread they want to be notified about on new replies.
  requestNotificationPermission: () => ipcRenderer.invoke('notifications:request'),
});
