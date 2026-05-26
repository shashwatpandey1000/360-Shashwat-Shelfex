import { Router } from 'express';
import { callback, me, refresh, logout } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { authLimiter } from '../../shared/middlewares/rateLimiter.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { callbackSchema } from './auth.types';

const router = Router();

// Public (with strict rate limit)
router.post('/callback', authLimiter, validate(callbackSchema), callback);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

// Protected
router.get('/me', authMiddleware, me);

export default router;
