import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

// Tenant context — extracts org_id and data scope from access map
// Must run AFTER auth middleware (which sets req.accessMap)
export const tenantContext = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.accessMap) {
    ApiResponse.unauthorized(res);
    return;
  }

  // Set org_id on request for easy access in controllers
  req.orgId = req.accessMap.orgId;

  next();
};
