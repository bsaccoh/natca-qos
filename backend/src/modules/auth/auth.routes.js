import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import * as svc from './auth.service.js';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/register', asyncHandler(async (req, res) => {
  const body = z.object({
    fullName:   z.string().min(2),
    phone:      z.string().optional(),
    email:      z.string().email().optional(),
    password:   z.string().min(8),
    districtId: z.number().int().optional(),
  }).parse(req.body);
  ok(res, await svc.register(body));
}));

router.post('/otp/send', asyncHandler(async (req, res) => {
  const { phone, purpose } = z.object({ phone: z.string(), purpose: z.string().optional() }).parse(req.body);
  ok(res, await svc.sendOtp(phone, purpose));
}));

router.post('/otp/verify', asyncHandler(async (req, res) => {
  const { phone, code, purpose } = z.object({ phone: z.string(), code: z.string(), purpose: z.string().optional() }).parse(req.body);
  ok(res, await svc.verifyOtp(phone, code, purpose));
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { identifier, password } = z.object({ identifier: z.string(), password: z.string() }).parse(req.body);
  const ctx = { userAgent: req.headers['user-agent'], ip: req.ip };
  ok(res, await svc.login(identifier, password, ctx));
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  ok(res, await svc.refresh(refreshToken));
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await svc.logout(refreshToken);
  ok(res, { loggedOut: true });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  ok(res, await svc.getMe(req.user.userId));
}));

router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const body = z.object({
    fullName: z.string().min(2).optional(),
    email:    z.string().email().optional(),
    phone:    z.string().optional(),
  }).parse(req.body);
  ok(res, await svc.updateProfile(req.user.userId, body));
}));

router.post('/reset-password/request', asyncHandler(async (req, res) => {
  const { phone } = z.object({ phone: z.string() }).parse(req.body);
  ok(res, await svc.resetPasswordRequest(phone));
}));

router.post('/reset-password/confirm', asyncHandler(async (req, res) => {
  const { phone, code, newPassword } = z.object({ phone: z.string(), code: z.string(), newPassword: z.string().min(8) }).parse(req.body);
  ok(res, await svc.resetPassword(phone, code, newPassword));
}));

export default router;
