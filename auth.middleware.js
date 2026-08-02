/**
 * auth.middleware.js
 * Verifies the JWT sent in the Authorization header and attaches the decoded
 * user payload to req.user. `requireAuth` blocks the request if there is no
 * valid token. `attachUserIfPresent` decodes the token when available but
 * lets the request continue either way (useful for routes that behave
 * differently for logged-in vs anonymous users, like showing edit buttons).
 */

const jwt = require('jsonwebtoken');

function getTokenFromHeader(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ error: 'You must be signed in to do that.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

function attachUserIfPresent(req, res, next) {
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      req.user = null;
    }
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = { requireAuth, attachUserIfPresent, requireRole };
