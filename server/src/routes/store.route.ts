import { Router } from 'express';
import { create, list, detail, update, deactivate } from '../controllers/store.controller';
import { assignManager } from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantContext } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createStoreSchema, updateStoreSchema } from '../validations/store.validation';
import { assignManagerSchema } from '../validations/employee.validation';

const router = Router();

// All store routes need auth + tenant context
router.use(authMiddleware, tenantContext);

router.post('/', requirePermission('stores:write'), validate(createStoreSchema), create);
router.get('/', requirePermission('stores:read'), list);
router.get('/:id', requirePermission('stores:read'), detail);
router.patch('/:id', requirePermission('stores:write'), validate(updateStoreSchema), update);
router.post('/:id/deactivate', requirePermission('stores:delete'), deactivate);
router.post('/:storeId/manager', requirePermission('stores:write'), validate(assignManagerSchema), assignManager);

export default router;
