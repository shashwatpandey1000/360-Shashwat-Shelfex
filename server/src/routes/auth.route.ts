import { Router } from 'express';
import { callback, me, refresh, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';
import { validate } from '../middlewares/validate.middleware';
import { callbackSchema } from '../validations/auth.validation';

const router = Router();

// Public (with strict rate limit)
router.post('/callback', authLimiter, validate(callbackSchema), callback);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

// Protected
router.get('/me', authMiddleware, me);

export default router;
