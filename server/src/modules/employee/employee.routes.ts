import { Router } from 'express';
import { create, list, detail, update, deactivate, reactivate } from './employee.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createEmployeeSchema, updateEmployeeSchema } from './employee.types';

const router = Router();

// All employee routes need auth + tenant context
router.use(authMiddleware, tenantContext);

router.post('/', requirePermission('employees:write'), validate(createEmployeeSchema), create);
router.get('/', requirePermission('employees:read'), list);
router.get('/:id', requirePermission('employees:read'), detail);
router.patch('/:id', requirePermission('employees:write'), validate(updateEmployeeSchema), update);
router.post('/:id/deactivate', requirePermission('employees:delete'), deactivate);
router.post('/:id/reactivate', requirePermission('employees:delete'), reactivate);

export default router;
