import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { startSurveySchema } from './survey.types';
import { start, addScene, addPhoto, submit, getUploadUrl, list, detail, mySlots } from './survey.controller';

const router = Router();

router.use(authMiddleware, tenantContext);

// IMPORTANT: /my-slots must come before /:id to avoid param capture
router.get('/my-slots', mySlots);

// Survey lifecycle (mobile capture app)
router.post('/start', requirePermission('surveys:execute'), validate(startSurveySchema), start);
router.post('/:id/scenes', requirePermission('surveys:execute'), addScene);
router.post('/:id/photos', requirePermission('surveys:execute'), addPhoto);
router.post('/:id/submit', requirePermission('surveys:execute'), submit);

// Upload URL (presigned S3)
router.get('/:id/upload-url', requirePermission('surveys:execute'), getUploadUrl);

// Dashboard queries
router.get('/', requirePermission('surveys:read'), list);
router.get('/:id', requirePermission('surveys:read'), detail);

export default router;
