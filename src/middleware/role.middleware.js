function requireRole(...allowedRoles) {
    return function (req, res, next) {
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }
  
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          status: "error",
          message: "Access denied",
        });
      }
  
      next();
    };
  }
  
  module.exports = requireRole;