import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler so rejected promises are forwarded to Express error middleware.
 * Eliminates the need for try/catch in every controller.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
