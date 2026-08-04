const { AppError } = require('../utils/errorHandler');

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('No autorizado para esta acción', 403));
  }
  next();
};

module.exports = { authorizeRoles };
