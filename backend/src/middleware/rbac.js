import { ApiError } from '../utils/ApiError.js';

const ROLE_HIERARCHY = [
  'SYSTEM_ADMIN',
  'NATCA_ADMIN',
  'NATCA_ANALYST',
  'INSPECTOR',
  'OPERATOR_ADMIN',
  'CITIZEN',
];

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}

export function requireAnyRole(...roles) {
  return requireRole(...roles);
}

export function operatorScope(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'OPERATOR_ADMIN' && req.user.operatorId) {
    req.scope = { operatorId: req.user.operatorId };
  } else {
    req.scope = { operatorId: req.query.operatorId ? Number(req.query.operatorId) : null };
  }
  next();
}

export function isAdmin(role) {
  return ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'].includes(role);
}
