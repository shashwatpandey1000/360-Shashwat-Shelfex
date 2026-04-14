import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const checkHealth = asyncHandler(async (_req: Request, res: Response) => {
  ApiResponse.success(res, {
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'shelf360-api',
  });
});
