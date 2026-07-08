/// Restricts a route to one or more roles.
/// Usage: router.post("/release", auth, roleGuard("admin"), releaseWill);
function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: requires role(s) ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
}

module.exports = roleGuard;
