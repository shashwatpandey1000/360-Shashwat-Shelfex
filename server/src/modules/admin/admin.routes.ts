import { Router } from 'express';
import { getPendingOrgs, approve, reject } from './admin.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { superAdminMiddleware } from '../../shared/middlewares/superAdmin.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { rejectOrgSchema } from '../org';

const router = Router();

// All admin routes require auth + super admin check
router.use(authMiddleware, superAdminMiddleware);

router.get('/orgs/pending', getPendingOrgs);
router.post('/orgs/:id/approve', approve);
router.post('/orgs/:id/reject', validate(rejectOrgSchema), reject);

export default router;
