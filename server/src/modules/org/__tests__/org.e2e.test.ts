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
      permissions: [
        'employees:read', 'employees:write', 'employees:delete',
        'stores:read', 'stores:write', 'stores:delete', 'stores:import',
        'schedule:read', 'schedule:write', 'schedule:delete',
        'surveys:read', 'surveys:execute',
        'settings:read', 'settings:write',
      ],
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

vi.mock('../org.service', () => ({
  registerOrg: vi.fn(),
  getOrgSettings: vi.fn(),
  updateOrgSettings: vi.fn(),
  listActiveSuperAdmins: vi.fn(),
  recordApprovalNotificationAttempt: vi.fn(),
}));

vi.mock('../../../shared/services/accessMap.service', () => ({
  findUserBySsoId: vi.fn(),
}));

vi.mock('../../../shared/services/email.service', () => ({
  sendOrgPendingApprovalEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

import request from 'supertest';
import app from '../../../app';
import * as orgService from '../org.service';
import * as accessMapService from '../../../shared/services/accessMap.service';

const mockedRegisterOrg = vi.mocked(orgService.registerOrg);
const mockedGetOrgSettings = vi.mocked(orgService.getOrgSettings);
const mockedUpdateOrgSettings = vi.mocked(orgService.updateOrgSettings);
const mockedListSuperAdmins = vi.mocked(orgService.listActiveSuperAdmins);
const mockedRecordAttempt = vi.mocked(orgService.recordApprovalNotificationAttempt);
const mockedFindUser = vi.mocked(accessMapService.findUserBySsoId);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /api/v1/orgs/register
// ---------------------------------------------------------------------------
describe('POST /api/v1/orgs/register', () => {
  const validBody = {
    orgName: 'ACME Corp',
    orgType: 'chain',
    industryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  };

  it('✅ 201 — registers a new org successfully', async () => {
    mockedFindUser.mockResolvedValueOnce(null);
    mockedRegisterOrg.mockResolvedValueOnce({
      org: { id: 'org-new', name: 'ACME Corp', slug: 'acme-corp', status: 'pending_approval', contactEmail: 'admin@acme.com', createdAt: new Date() } as any,
      user: { id: 'user-new', roleTemplate: 'org_manager' } as any,
    });
    mockedListSuperAdmins.mockResolvedValueOnce([]);
    mockedRecordAttempt.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/orgs/register')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.org.name).toBe('ACME Corp');
    expect(res.body.data.org.status).toBe('pending_approval');
    expect(res.body.data.user.roleTemplate).toBe('org_manager');
  });

  it('❌ 401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/orgs/register')
      .set('x-test-no-auth', 'true')
      .send(validBody);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — user already belongs to an organization', async () => {
    mockedFindUser.mockResolvedValueOnce({ id: 'existing-user', orgId: 'existing-org' } as any);

    const res = await request(app)
      .post('/api/v1/orgs/register')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already belong');
  });

  it('❌ 400 — invalid body (missing orgName)', async () => {
    const res = await request(app)
      .post('/api/v1/orgs/register')
      .send({ orgType: 'chain', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata', industryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — invalid body (missing orgType)', async () => {
    const res = await request(app)
      .post('/api/v1/orgs/register')
      .send({ orgName: 'Test', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata', industryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/orgs/settings
// ---------------------------------------------------------------------------
describe('GET /api/v1/orgs/settings', () => {
  it('✅ 200 — returns org settings', async () => {
    mockedGetOrgSettings.mockResolvedValueOnce({
      id: 'org-uuid-1234',
      name: 'ACME Corp',
      slug: 'acme-corp',
      type: 'chain',
      status: 'active',
      country: 'IN',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    } as any);

    const res = await request(app).get('/api/v1/orgs/settings');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('ACME Corp');
  });

  it('❌ 401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .get('/api/v1/orgs/settings')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ 404 — org not found', async () => {
    mockedGetOrgSettings.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/orgs/settings');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/orgs/settings
// ---------------------------------------------------------------------------
describe('PATCH /api/v1/orgs/settings', () => {
  it('✅ 200 — updates and returns org settings', async () => {
    mockedUpdateOrgSettings.mockResolvedValueOnce({
      id: 'org-uuid-1234',
      name: 'ACME Corp Updated',
      website: 'https://acme.com',
    } as any);

    const res = await request(app)
      .patch('/api/v1/orgs/settings')
      .send({ name: 'ACME Corp Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('ACME Corp Updated');
  });

  it('❌ 401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .patch('/api/v1/orgs/settings')
      .set('x-test-no-auth', 'true')
      .send({ name: 'X' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — invalid body (name too short)', async () => {
    const res = await request(app)
      .patch('/api/v1/orgs/settings')
      .send({ name: 'X' }); // min length is 2, but schema says min(2) — borderline

    // Zod allows exactly 2 chars, but 1 char should fail
    const res2 = await request(app)
      .patch('/api/v1/orgs/settings')
      .send({ name: 'A' });

    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);
  });
});
