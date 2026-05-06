import { Router } from 'express';
import { create, list, all, detail, update, remove } from '../controllers/zone.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantContext } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createZoneSchema, updateZoneSchema } from '../validations/zone.validation';

const router = Router();

// All zone routes need auth + tenant context
router.use(authMiddleware, tenantContext);

router.post('/', requirePermission('stores:write'), validate(createZoneSchema), create);
router.get('/', requirePermission('stores:read'), list);
router.get('/all', requirePermission('stores:read'), all);
router.get('/:id', requirePermission('stores:read'), detail);
router.patch('/:id', requirePermission('stores:write'), validate(updateZoneSchema), update);
router.delete('/:id', requirePermission('stores:delete'), remove);

export default router;
