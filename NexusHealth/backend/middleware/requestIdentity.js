// backend/middleware/requestIdentity.js
const { User } = require('../models');
const { verifyAccessToken } = require('../services/authService');

const loadActiveUser = async (userId) => {
  const user = await User.findOne({ userId }).lean();
  if (!user) return null;
  if (user.accountStatus !== 'ACTIVE') return null;
  return user;
};

const requireAuthenticatedUser = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      const user = await loadActiveUser(payload.sub);
      if (!user) {
        return res.status(401).json({ error: 'Authenticated user not found' });
      }
      req.authUser = user;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const userId = req.header('x-user-id');
    if (userId) {
      const user = await loadActiveUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'Authenticated user not found' });
      }
      req.authUser = user;
      return next();
    }
  }

  return res.status(401).json({ error: 'Authentication required' });
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.authUser || !roles.includes(req.authUser.role)) {
    return res.status(403).json({ error: 'Insufficient role for this operation' });
  }
  return next();
};

module.exports = { requireAuthenticatedUser, requireRole, loadActiveUser };
