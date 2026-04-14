import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { findSuperAdmin } from '../services/org.service';

// Extend Express Request to include superAdmin
declare global {
  namespace Express {
    interface Request {
      superAdmin?: { id: string; ssoUserId: string; email: string; name: string };
    }
  }
}

// Checks if the authenticated user is a super admin
// Must run AFTER authMiddleware (which sets req.user)
export const superAdminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    ApiResponse.unauthorized(res);
    return;
  }

  const admin = await findSuperAdmin(req.user.userId);
  if (!admin) {
    ApiResponse.forbidden(res, 'Super admin access required');
    return;
  }

  req.superAdmin = {
    id: admin.id,
    ssoUserId: admin.ssoUserId,
    email: admin.email,
    name: admin.name,
  };

  next();
};
