import { Router } from 'express';
import { register, getSettings, updateSettings } from '../controllers/org.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantContext } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { validate } from '../middlewares/validate.middleware';
import { registerOrgSchema } from '../validations/org.validation';
import { updateOrgSettingsSchema } from '../validations/settings.validation';

const router = Router();

// Public (auth only, no org yet)
router.post('/register', authMiddleware, validate(registerOrgSchema), register);

// Protected (auth + org + permissions)
router.get('/settings', authMiddleware, tenantContext, requirePermission('settings:read'), getSettings);
router.patch('/settings', authMiddleware, tenantContext, requirePermission('settings:write'), validate(updateOrgSettingsSchema), updateSettings);

export default router;
