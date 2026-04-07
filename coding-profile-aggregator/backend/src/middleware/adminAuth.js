/**
 * adminAuth.js
 * ------------
 * Middleware to check if authenticated user has admin role
 */

const requireAdmin = (req, res, next) => {
  // Check if user is authenticated (should be done by authenticate middleware first)
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }

  // User is admin, proceed
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      error: 'admin access required',
      message: 'Only superadmins can perform this action'
    });
  }

  next();
};

module.exports = { requireAdmin, requireSuperAdmin };
