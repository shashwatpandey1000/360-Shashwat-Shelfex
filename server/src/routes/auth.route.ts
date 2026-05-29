import { Router } from 'express';
import { callback, me, refresh, logout, introspect } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { serviceAuthMiddleware } from '../middlewares/serviceAuth.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { validate } from '../middlewares/validate.middleware';
import { callbackSchema, introspectSchema } from '../validations/auth.validation';

const router = Router();

// Public (with strict rate limit)
router.post('/callback', authLimiter, validate(callbackSchema), callback);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

// Service-to-service (gated by x-api-key)
router.post(
  '/introspect',
  authLimiter,
  serviceAuthMiddleware,
  validate(introspectSchema),
  introspect,
);

// Protected
router.get('/me', authMiddleware, me);

export default router;
