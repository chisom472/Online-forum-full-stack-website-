/**
 * downloads.routes.js
 * Serves version metadata for the desktop and mobile apps so the download
 * page can show current versions and correct file links without hardcoding
 * them into the HTML. Actual installer binaries are built separately (see
 * /desktop-app and /mobile-app) and would be placed in /public/downloads.
 */

const express = require('express');
const router = express.Router();

const RELEASES = {
  desktop: {
    version: '1.0.0',
    windows: '/downloads/DigitalEnviro-Setup-1.0.0.exe',
    mac: '/downloads/DigitalEnviro-1.0.0.dmg',
    linux: '/downloads/DigitalEnviro-1.0.0.AppImage',
    released: '2026-07-31',
    notes: 'Initial release: forum, blog, notifications, and offline reading list.',
  },
  mobile: {
    version: '1.0.0',
    android: '/downloads/DigitalEnviro-1.0.0.apk',
    ios: 'https://apps.apple.com/app/digital-enviro/id0000000000',
    released: '2026-07-31',
    notes: 'Initial release: full forum and blog access, push notifications for replies.',
  },
};

router.get('/', (req, res) => {
  res.json(RELEASES);
});

module.exports = router;
