import { Router } from 'express';
import { callback, me, refresh, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public
router.post('/callback', callback);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected
router.get('/me', authMiddleware, me);

export default router;
