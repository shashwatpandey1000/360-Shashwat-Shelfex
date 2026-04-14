import { Router } from 'express';
import { getPendingOrgs, approve, reject } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { superAdminMiddleware } from '../middlewares/superAdmin.middleware';
import { validate } from '../middlewares/validate.middleware';
import { rejectOrgSchema } from '../validations/org.validation';

const router = Router();

// All admin routes require auth + super admin check
router.use(authMiddleware, superAdminMiddleware);

router.get('/orgs/pending', getPendingOrgs);
router.post('/orgs/:id/approve', approve);
router.post('/orgs/:id/reject', validate(rejectOrgSchema), reject);

export default router;
