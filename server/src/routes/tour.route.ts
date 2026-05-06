import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantContext } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { validate } from '../middlewares/validate.middleware';
import { tourSyncSchema } from '../validations/tour.validation';
import { sync, list, detail, activeForStore } from '../controllers/tour.controller';

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
