import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listPendingOrgs, approveOrg, rejectOrg, getOrgById } from '../services/org.service';
import { sendOrgApprovedEmail, sendOrgRejectedEmail } from '../services/email.service';

// GET /admin/orgs/pending — list orgs awaiting approval
export const getPendingOrgs = asyncHandler(async (_req: Request, res: Response) => {
  const orgs = await listPendingOrgs();
  ApiResponse.success(res, orgs);
});

// POST /admin/orgs/:id/approve
export const approve = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const superAdminId = req.superAdmin!.id;

  const org = await getOrgById(id);
  if (!org) {
    ApiResponse.notFound(res, 'Organization not found');
    return;
  }

  if (org.status !== 'pending_approval') {
    ApiResponse.badRequest(res, `Organization is already ${org.status}`);
    return;
  }

  const updated = await approveOrg(id, superAdminId);

  // Send approval email (non-blocking)
  const loginUrl = process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3001';
  sendOrgApprovedEmail(org.contactEmail, org.name, loginUrl);

  ApiResponse.success(res, updated, 'Organization approved');
});

// POST /admin/orgs/:id/reject
export const reject = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { reason } = req.body;

  const org = await getOrgById(id);
  if (!org) {
    ApiResponse.notFound(res, 'Organization not found');
    return;
  }

  if (org.status !== 'pending_approval') {
    ApiResponse.badRequest(res, `Organization is already ${org.status}`);
    return;
  }

  const updated = await rejectOrg(id, reason);

  // Send rejection email (non-blocking)
  sendOrgRejectedEmail(org.contactEmail, org.name, reason);

  ApiResponse.success(res, updated, 'Organization rejected');
});
