/**
 * adminAuth.js
 * ------------
 * Middleware to check if authenticated user has admin role.
 * Roles: 'admin' (staff) | 'user' (student). superadmin removed.
 */

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
};

// Alias kept so existing route imports compile without changes
const requireSuperAdmin = requireAdmin;

module.exports = { requireAdmin, requireSuperAdmin };
