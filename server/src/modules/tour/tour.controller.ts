import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { listToursSchema } from './tour.types';
import { syncTour, getActiveTour, getTourById, listTours } from './tour.service';

// POST /tours/sync — capture app registers a completed tour
export const sync = asyncHandler(async (req: Request, res: Response) => {
  const capturedBy = req.accessMap?.userId ?? null;
  try {
    const result = await syncTour(req.orgId!, req.body, capturedBy);
    ApiResponse.created(res, result, 'Tour synced');
  } catch (err: any) {
    if (err.statusCode === 404) {
      ApiResponse.notFound(res, err.message);
    } else {
      throw err;
    }
  }
});

// GET /tours — list tours (scoped)
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listToursSchema.parse(req.query);
  const result = await listTours(req.orgId!, query, req.accessMap!);
  ApiResponse.success(res, result);
});

// GET /tours/:id — tour detail with scenes + shelves
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const tour = await getTourById(req.orgId!, req.params['id'] as string);
  if (!tour) { ApiResponse.notFound(res, 'Tour not found'); return; }
  ApiResponse.success(res, tour);
});

// GET /stores/:storeId/tour — active tour for a store
export const activeForStore = asyncHandler(async (req: Request, res: Response) => {
  const tour = await getActiveTour(req.orgId!, req.params['storeId'] as string);
  // 200 with null data is intentional — store may not have a tour yet
  ApiResponse.success(res, tour);
});
