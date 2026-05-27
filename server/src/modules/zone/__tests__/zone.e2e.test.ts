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

vi.mock('../zone.service', () => ({
  createZone: vi.fn(),
  listZones: vi.fn(),
  getAllZones: vi.fn(),
  getZoneById: vi.fn(),
  updateZone: vi.fn(),
  deleteZone: vi.fn(),
}));

import request from 'supertest';
import app from '../../../app';
import * as zoneService from '../zone.service';

const mockedCreate = vi.mocked(zoneService.createZone);
const mockedList = vi.mocked(zoneService.listZones);
const mockedGetAll = vi.mocked(zoneService.getAllZones);
const mockedGetById = vi.mocked(zoneService.getZoneById);
const mockedUpdate = vi.mocked(zoneService.updateZone);
const mockedDelete = vi.mocked(zoneService.deleteZone);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeZone = {
  id: 'zone-uuid-1',
  orgId: 'org-uuid-1234',
  name: 'North Region',
  description: null,
  parentZoneId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// POST /api/v1/zones
// ---------------------------------------------------------------------------
describe('POST /api/v1/zones', () => {
  it('✅ 201 — creates zone', async () => {
    mockedCreate.mockResolvedValueOnce(fakeZone as any);

    const res = await request(app)
      .post('/api/v1/zones')
      .send({ name: 'North Region' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('North Region');
  });

  it('❌ 400 — missing name field', async () => {
    const res = await request(app)
      .post('/api/v1/zones')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/zones')
      .set('x-test-no-auth', 'true')
      .send({ name: 'North Region' });

    expect(res.status).toBe(401);
  });

  it('❌ 403 — no permission', async () => {
    const res = await request(app)
      .post('/api/v1/zones')
      .set('x-test-no-permission', 'true')
      .send({ name: 'North Region' });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/zones
// ---------------------------------------------------------------------------
describe('GET /api/v1/zones', () => {
  it('✅ 200 — returns paginated zone list', async () => {
    mockedList.mockResolvedValueOnce({
      data: [fakeZone],
      total: 1,
      page: 1,
      perPage: 25,
      totalPages: 1,
    } as any);

    const res = await request(app).get('/api/v1/zones');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/zones')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/zones/all
// ---------------------------------------------------------------------------
describe('GET /api/v1/zones/all', () => {
  it('✅ 200 — returns flat list of all zones', async () => {
    mockedGetAll.mockResolvedValueOnce([fakeZone] as any);

    const res = await request(app).get('/api/v1/zones/all');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/zones/all')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/zones/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/zones/:id', () => {
  it('✅ 200 — returns zone detail', async () => {
    mockedGetById.mockResolvedValueOnce(fakeZone as any);

    const res = await request(app).get('/api/v1/zones/zone-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('zone-uuid-1');
  });

  it('❌ 404 — zone not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/zones/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/zones/zone-uuid-1')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/zones/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/v1/zones/:id', () => {
  it('✅ 200 — updates zone', async () => {
    // Controller calls getZoneById first to verify existence
    mockedGetById.mockResolvedValueOnce(fakeZone as any);
    mockedUpdate.mockResolvedValueOnce({ ...fakeZone, name: 'South Region' } as any);

    const res = await request(app)
      .patch('/api/v1/zones/zone-uuid-1')
      .send({ name: 'South Region' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('South Region');
  });

  it('❌ 404 — zone not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/zones/non-existent')
      .send({ name: 'X' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/v1/zones/zone-uuid-1')
      .set('x-test-no-auth', 'true')
      .send({ name: 'X' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/zones/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/zones/:id', () => {
  it('✅ 200 — deletes zone successfully', async () => {
    // Controller calls getZoneById first to verify existence, then deleteZone
    mockedGetById.mockResolvedValueOnce(fakeZone as any);
    mockedDelete.mockResolvedValueOnce(fakeZone as any);

    const res = await request(app).delete('/api/v1/zones/zone-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — zone not found (getZoneById returns null)', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app).delete('/api/v1/zones/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — zone has sub-zones (deleteZone service throws, controller wraps in badRequest)', async () => {
    mockedGetById.mockResolvedValueOnce(fakeZone as any);
    mockedDelete.mockRejectedValueOnce(new Error('Cannot delete a zone that has sub-zones. Remove sub-zones first.'));

    const res = await request(app).delete('/api/v1/zones/zone-uuid-1');

    // The zone controller wraps deleteZone errors in ApiResponse.badRequest
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('sub-zones');
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .delete('/api/v1/zones/zone-uuid-1')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});
