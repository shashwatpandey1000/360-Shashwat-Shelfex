import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../shared/db';
import { industries, storeCategories } from '../../shared/db/schema';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';

// GET /lookups/industries
export const listIndustries = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await db
    .select({ id: industries.id, name: industries.name })
    .from(industries)
    .where(eq(industries.isActive, true))
    .orderBy(industries.displayOrder);

  ApiResponse.success(res, rows);
});

// GET /lookups/store-categories
export const listStoreCategories = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await db
    .select({ id: storeCategories.id, name: storeCategories.name })
    .from(storeCategories)
    .where(eq(storeCategories.isActive, true))
    .orderBy(storeCategories.displayOrder);

  ApiResponse.success(res, rows);
});
