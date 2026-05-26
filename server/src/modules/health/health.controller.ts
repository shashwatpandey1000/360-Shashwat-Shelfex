import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';

export const checkHealth = asyncHandler(async (_req: Request, res: Response) => {
  ApiResponse.success(res, {
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'shelf360-api',
  });
});
