import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { registerOrg, getOrgSettings, updateOrgSettings } from '../services/org.service';
import { findUserBySsoId } from '../services/accessMap.service';

// POST /orgs/register — create org + first user (org_manager)
export const register = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    ApiResponse.unauthorized(res);
    return;
  }

  const existingUser = await findUserBySsoId(req.user.userId);
  if (existingUser) {
    ApiResponse.badRequest(res, 'You already belong to an organization');
    return;
  }

  const { org, user } = await registerOrg(req.body, req.user.userId, req.user.email);

  ApiResponse.created(res, {
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
    },
    user: {
      id: user.id,
      roleTemplate: user.roleTemplate,
    },
  }, 'Organization registered successfully. Pending approval.');
});

// GET /orgs/settings — get current org settings
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) {
    ApiResponse.unauthorized(res);
    return;
  }

  const org = await getOrgSettings(req.orgId);
  if (!org) {
    ApiResponse.notFound(res, 'Organization not found');
    return;
  }

  ApiResponse.success(res, org);
});

// PATCH /orgs/settings — update org settings
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) {
    ApiResponse.unauthorized(res);
    return;
  }

  const updated = await updateOrgSettings(req.orgId, req.body);
  if (!updated) {
    ApiResponse.notFound(res, 'Organization not found');
    return;
  }

  ApiResponse.success(res, updated, 'Settings updated');
});
