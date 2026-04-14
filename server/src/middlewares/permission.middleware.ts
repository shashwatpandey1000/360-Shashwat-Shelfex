import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import type { Permission } from '../utils/permissions';

// Middleware factory: checks if the user has a specific permission
// Usage: router.get('/stores', requirePermission('stores:read'), handler)
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.accessMap) {
      ApiResponse.unauthorized(res);
      return;
    }

    if (!req.accessMap.permissions.includes(permission)) {
      ApiResponse.forbidden(res, `Missing permission: ${permission}`);
      return;
    }

    next();
  };
};

// Middleware factory: checks if the user has ANY of the given permissions
// Usage: router.get('/stores', requireAnyPermission(['stores:read', 'stores:write']), handler)
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.accessMap) {
      ApiResponse.unauthorized(res);
      return;
    }

    const hasAny = permissions.some((p) => req.accessMap!.permissions.includes(p));
    if (!hasAny) {
      ApiResponse.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};
