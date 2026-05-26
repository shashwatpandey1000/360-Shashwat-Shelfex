import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  registerOrg,
  getOrgSettings,
  updateOrgSettings,
  listActiveSuperAdmins,
  recordApprovalNotificationAttempt,
} from './org.service';
import { findUserBySsoId } from '../../shared/services/accessMap.service';
import { sendOrgPendingApprovalEmail } from '../../shared/services/email.service';
import logger from '../../shared/utils/logger';

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

  // Attempt super-admin notifications; onboarding success should not depend on email delivery.
  try {
    const superAdmins = await listActiveSuperAdmins();
    if (superAdmins.length === 0) {
      await recordApprovalNotificationAttempt(org.id, false, 'No active super admins configured');
    } else {
      const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
      const pendingOrgsUrl = `${apiBaseUrl}/api/v1/admin/orgs/pending`;
      const results = await Promise.all(
        superAdmins.map((admin) =>
          sendOrgPendingApprovalEmail(
            admin.email,
            org.name,
            org.contactEmail,
            org.createdAt,
            pendingOrgsUrl,
          ),
        ),
      );

      const sentToAny = results.some((r) => r.ok);
      const error = sentToAny
        ? undefined
        : results
            .map((r) => r.error)
            .filter(Boolean)
            .join(' | ') || 'All super-admin notification emails failed';

      await recordApprovalNotificationAttempt(org.id, sentToAny, error);
    }
  } catch (err) {
    logger.error(
      `Failed to process approval notifications for org ${org.id}: ${(err as Error).message}`,
    );
  }

  ApiResponse.created(
    res,
    {
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
    },
    'Organization registered successfully. Pending approval.',
  );
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
