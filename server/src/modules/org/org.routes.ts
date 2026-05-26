import { Router } from 'express';
import { register, getSettings, updateSettings } from './org.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { registerOrgSchema, updateOrgSettingsSchema } from './org.types';

const router = Router();

// Public (auth only, no org yet)
router.post('/register', authMiddleware, validate(registerOrgSchema), register);

// Protected (auth + org + permissions)
router.get(
  '/settings',
  authMiddleware,
  tenantContext,
  requirePermission('settings:read'),
  getSettings,
);
router.patch(
  '/settings',
  authMiddleware,
  tenantContext,
  requirePermission('settings:write'),
  validate(updateOrgSettingsSchema),
  updateSettings,
);

export default router;
