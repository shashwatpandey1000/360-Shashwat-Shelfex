// vi.mock calls MUST come before any other imports — Vitest hoists them.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../shared/middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    if (req.headers['x-test-no-auth']) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = { userId: 'caller-uuid', email: 'admin@acme.com', emailVerified: true };
    req.isFirstLogin = false;
    next();
  },
}));

vi.mock('../../../shared/middlewares/tenant.middleware', () => ({
  tenantContext: (req: any, _res: any, next: any) => {
    req.orgId = 'org-uuid-1234';
    req.accessMap = {
      orgId: 'org-uuid-1234',
      userId: 'caller-uuid',
      roleTemplate: 'org_manager',
      scopeType: 'org',
      dataScope: { storeIds: [], zoneIds: [] },
      scopeEntityIds: [],
      permissions: ['settings:read', 'settings:write'],
      modules: ['core'],
      orgStatus: 'active',
    };
    next();
  },
}));

vi.mock('../../../shared/middlewares/permission.middleware', () => ({
  requirePermission: (_perm: string) => (req: any, res: any, next: any) => {
    if (req.headers['x-test-no-permission']) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
}));

vi.mock('../../../shared/middlewares/superAdmin.middleware', () => ({
  superAdminMiddleware: (req: any, res: any, next: any) => {
    if (req.headers['x-test-no-superadmin']) {
      return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
    req.superAdmin = {
      id: 'sadmin-uuid',
      ssoUserId: 'sso-uuid',
      email: 'sa@shelfex.com',
      name: 'Super Admin',
    };
    next();
  },
}));

vi.mock('../../org', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../org')>();
  return {
    ...actual,
    listPendingOrgs: vi.fn(),
    getOrgById: vi.fn(),
    approveOrg: vi.fn(),
    rejectOrg: vi.fn(),
    // Keep the real rejectOrgSchema so validate() middleware works correctly
    rejectOrgSchema: actual.rejectOrgSchema,
  };
});

vi.mock('../../../shared/services/email.service', () => ({
  sendOrgApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendOrgRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendOrgPendingApprovalEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

import request from 'supertest';
import app from '../../../app';
import * as orgModule from '../../org';

const mockedListPending = vi.mocked(orgModule.listPendingOrgs);
const mockedGetOrgById = vi.mocked(orgModule.getOrgById);
const mockedApproveOrg = vi.mocked(orgModule.approveOrg);
const mockedRejectOrg = vi.mocked(orgModule.rejectOrg);

beforeEach(() => {
  vi.clearAllMocks();
});

const pendingOrg = {
  id: 'org-uuid-pending',
  name: 'Pending Corp',
  slug: 'pending-corp',
  status: 'pending_approval',
  contactEmail: 'contact@pending.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const approvedOrg = {
  ...pendingOrg,
  status: 'active',
  approvedAt: new Date().toISOString(),
  approvedBy: 'sadmin-uuid',
};

// ---------------------------------------------------------------------------
// GET /api/v1/admin/orgs/pending
// ---------------------------------------------------------------------------
describe('GET /api/v1/admin/orgs/pending', () => {
  it('✅ 200 — returns list of pending orgs', async () => {
    mockedListPending.mockResolvedValueOnce([pendingOrg] as any);

    const res = await request(app).get('/api/v1/admin/orgs/pending');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('pending_approval');
  });

  it('✅ 200 — returns empty list when no pending orgs', async () => {
    mockedListPending.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/v1/admin/orgs/pending');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('❌ 403 — not a super admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orgs/pending')
      .set('x-test-no-superadmin', 'true');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Super admin');
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orgs/pending')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/admin/orgs/:id/approve
// ---------------------------------------------------------------------------
describe('POST /api/v1/admin/orgs/:id/approve', () => {
  it('✅ 200 — approves a pending org', async () => {
    mockedGetOrgById.mockResolvedValueOnce(pendingOrg as any);
    mockedApproveOrg.mockResolvedValueOnce(approvedOrg as any);

    const res = await request(app).post('/api/v1/admin/orgs/org-uuid-pending/approve');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
    expect(res.body.message).toContain('approved');
  });

  it('❌ 404 — org not found', async () => {
    mockedGetOrgById.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/v1/admin/orgs/non-existent/approve');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — org is already approved (status !== pending_approval)', async () => {
    mockedGetOrgById.mockResolvedValueOnce({ ...pendingOrg, status: 'active' } as any);

    const res = await request(app).post('/api/v1/admin/orgs/org-uuid-pending/approve');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already active');
  });

  it('❌ 400 — org is already rejected', async () => {
    mockedGetOrgById.mockResolvedValueOnce({ ...pendingOrg, status: 'rejected' } as any);

    const res = await request(app).post('/api/v1/admin/orgs/org-uuid-pending/approve');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already rejected');
  });

  it('❌ 403 — not a super admin', async () => {
    const res = await request(app)
      .post('/api/v1/admin/orgs/org-uuid-pending/approve')
      .set('x-test-no-superadmin', 'true');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/admin/orgs/org-uuid-pending/approve')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/admin/orgs/:id/reject
// ---------------------------------------------------------------------------
describe('POST /api/v1/admin/orgs/:id/reject', () => {
  it('✅ 200 — rejects a pending org with a reason', async () => {
    mockedGetOrgById.mockResolvedValueOnce(pendingOrg as any);
    mockedRejectOrg.mockResolvedValueOnce({
      ...pendingOrg,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: 'Duplicate registration',
    } as any);

    const res = await request(app)
      .post('/api/v1/admin/orgs/org-uuid-pending/reject')
      .send({ reason: 'Duplicate registration' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('rejected');
  });

  it('❌ 404 — org not found', async () => {
    mockedGetOrgById.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/admin/orgs/non-existent/reject')
      .send({ reason: 'Duplicate' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — org is not in pending_approval state', async () => {
    mockedGetOrgById.mockResolvedValueOnce({ ...pendingOrg, status: 'active' } as any);

    const res = await request(app)
      .post('/api/v1/admin/orgs/org-uuid-pending/reject')
      .send({ reason: 'Duplicate' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — missing reason in body (Zod validation fails)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/orgs/org-uuid-pending/reject')
      .send({});

    // Zod validate middleware will reject this
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 403 — not a super admin', async () => {
    const res = await request(app)
      .post('/api/v1/admin/orgs/org-uuid-pending/reject')
      .set('x-test-no-superadmin', 'true')
      .send({ reason: 'Duplicate' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/admin/orgs/org-uuid-pending/reject')
      .set('x-test-no-auth', 'true')
      .send({ reason: 'Duplicate' });

    expect(res.status).toBe(401);
  });
});
