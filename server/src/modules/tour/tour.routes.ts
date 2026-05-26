import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { tourSyncSchema } from './tour.types';
import { sync, list, detail, activeForStore } from './tour.controller';

const router = Router();

router.use(authMiddleware, tenantContext);

// Capture app calls this after completing a tour
router.post('/sync', requirePermission('stores:write'), validate(tourSyncSchema), sync);

// Dashboard queries
router.get('/', requirePermission('stores:read'), list);
router.get('/:id', requirePermission('stores:read'), detail);

// Convenience: active tour for a specific store
router.get('/stores/:storeId/active', requirePermission('stores:read'), activeForStore);

export default router;
