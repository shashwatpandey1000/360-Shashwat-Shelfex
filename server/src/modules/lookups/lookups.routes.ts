import { Router } from 'express';
import { listIndustries, listStoreCategories } from './lookups.controller';

const router = Router();

// Public endpoints — no auth required (used in registration form)
router.get('/industries', listIndustries);
router.get('/store-categories', listStoreCategories);

export default router;
