const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions;

    if (userPermissions && userPermissions.includes(requiredPermission)) {
      return next();
    }

    if (userPermissions && userPermissions.includes("admin:full_access")) {
      return next();
    }

    return res.status(403).json({
      message: "Acesso negado. Você não tem permissão para realizar esta ação.",
    });
  };
};

module.exports = checkPermission;
