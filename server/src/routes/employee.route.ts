import { Router } from 'express';
import { create, list, detail, update, deactivate } from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantContext } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createEmployeeSchema, updateEmployeeSchema } from '../validations/employee.validation';

const router = Router();

// All employee routes need auth + tenant context
router.use(authMiddleware, tenantContext);

router.post('/', requirePermission('employees:write'), validate(createEmployeeSchema), create);
router.get('/', requirePermission('employees:read'), list);
router.get('/:id', requirePermission('employees:read'), detail);
router.patch('/:id', requirePermission('employees:write'), validate(updateEmployeeSchema), update);
router.post('/:id/deactivate', requirePermission('employees:delete'), deactivate);

export default router;
