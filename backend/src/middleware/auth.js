import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(ApiError.unauthorized());
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = {
      userId:     payload.sub,
      role:       payload.role,
      operatorId: payload.operatorId ?? null,
      email:      payload.email,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Token invalid or expired'));
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), env.jwt.secret);
    req.user = {
      userId:     payload.sub,
      role:       payload.role,
      operatorId: payload.operatorId ?? null,
      email:      payload.email,
    };
  } catch { /* ignore */ }
  next();
}
