import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

// Verifies a shared API key on the `x-api-key` header. Used to gate service-to-service
// endpoints (e.g. the AI stitching service calling /auth/introspect) so they can't be
// hit by arbitrary clients on the internet.
export const serviceAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.INTROSPECT_API_KEY;
  const provided = req.headers['x-api-key'];

  if (!expected || typeof provided !== 'string' || provided !== expected) {
    ApiResponse.unauthorized(res, 'Invalid service credentials');
    return;
  }

  next();
};
