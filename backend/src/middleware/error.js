import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

export function errorHandler(err, req, res, _next) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err.flatten() });
  }

  // Known API errors
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details ?? undefined });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry', detail: err.detail });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record not found', detail: err.detail });
  }

  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err?.message,
    code: err?.code,
    detail: err?.detail,
  });
}
