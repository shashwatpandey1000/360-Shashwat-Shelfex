import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { create, list, detail, update, deactivate, bulkImport } from './store.controller';
import { assignManager } from '../employee/employee.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createStoreSchema, updateStoreSchema } from './store.types';
import { assignManagerSchema } from '../employee/employee.types';
import { ApiResponse } from '../../shared/utils/ApiResponse';

const router = Router();

// All store routes need auth + tenant context
router.use(authMiddleware, tenantContext);

// Multer: memory storage, 25 MB limit (covers ~150k rows), CSV only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// Wraps multer so its errors get converted to ApiResponse instead of crashing
function uploadMiddleware(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      ApiResponse.badRequest(res, 'File too large. Maximum allowed size is 2 MB.');
      return;
    }
    ApiResponse.badRequest(res, err instanceof Error ? err.message : 'File upload failed.');
  });
}

// POST /stores/bulk-import — must be registered BEFORE /:id routes
router.post('/bulk-import', requirePermission('stores:import'), uploadMiddleware, bulkImport);

router.post('/', requirePermission('stores:write'), validate(createStoreSchema), create);
router.get('/', requirePermission('stores:read'), list);
router.get('/:id', requirePermission('stores:read'), detail);
router.patch('/:id', requirePermission('stores:write'), validate(updateStoreSchema), update);
router.post('/:id/deactivate', requirePermission('stores:delete'), deactivate);
router.post(
  '/:storeId/manager',
  requirePermission('stores:write'),
  validate(assignManagerSchema),
  assignManager,
);

export default router;
