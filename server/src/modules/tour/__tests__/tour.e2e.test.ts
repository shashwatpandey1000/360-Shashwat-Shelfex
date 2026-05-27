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
        'stores:read', 'stores:write',
        'surveys:read', 'surveys:execute',
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

vi.mock('../tour.service', () => ({
  syncTour: vi.fn(),
  listTours: vi.fn(),
  getTourById: vi.fn(),
  getActiveTour: vi.fn(),
}));

import request from 'supertest';
import app from '../../../app';
import * as tourService from '../tour.service';

const mockedSync = vi.mocked(tourService.syncTour);
const mockedList = vi.mocked(tourService.listTours);
const mockedGetById = vi.mocked(tourService.getTourById);
const mockedGetActive = vi.mocked(tourService.getActiveTour);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeTour = {
  id: 'tour-uuid',
  orgId: 'org-uuid-1234',
  storeId: 'store-uuid',
  version: 1,
  status: 'active',
  isBaseline: true,
  sceneCount: 3,
  shelfCount: 5,
  capturedBy: 'caller-uuid',
  createdAt: new Date().toISOString(),
  scenes: [],
};

const validSyncBody = {
  storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  capturedAt: new Date().toISOString(),
  appVersion: '2.0.0',
  scenes: [
    {
      sceneId: 'scene-ext-1',
      panoramaUrl: 'https://cdn.example.com/scene1.jpg',
      displayOrder: 0,
      floor: 0,
    },
  ],
  shelves: [],
};

// ---------------------------------------------------------------------------
// POST /api/v1/tours/sync
// ---------------------------------------------------------------------------
describe('POST /api/v1/tours/sync', () => {
  it('✅ 201 — syncs tour successfully', async () => {
    mockedSync.mockResolvedValueOnce({
      tourId: 'tour-uuid',
      version: 1,
      isBaseline: true,
      storeStatus: 'active',
      sceneCount: 1,
      shelfCount: 0,
    } as any);

    const res = await request(app)
      .post('/api/v1/tours/sync')
      .send(validSyncBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tourId).toBe('tour-uuid');
    expect(res.body.data.isBaseline).toBe(true);
  });

  it('❌ 404 — store not found', async () => {
    const err: any = new Error('Store not found');
    err.statusCode = 404;
    mockedSync.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/v1/tours/sync')
      .send(validSyncBody);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — missing scenes array', async () => {
    const res = await request(app)
      .post('/api/v1/tours/sync')
      .send({ ...validSyncBody, scenes: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/tours/sync')
      .set('x-test-no-auth', 'true')
      .send(validSyncBody);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/tours
// ---------------------------------------------------------------------------
describe('GET /api/v1/tours', () => {
  it('✅ 200 — returns paginated tour list', async () => {
    mockedList.mockResolvedValueOnce({
      data: [fakeTour],
      total: 1,
      page: 1,
      perPage: 25,
      totalPages: 1,
    } as any);

    const res = await request(app).get('/api/v1/tours');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/tours')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/tours/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/tours/:id', () => {
  it('✅ 200 — returns tour detail with scenes and shelves', async () => {
    mockedGetById.mockResolvedValueOnce(fakeTour as any);

    const res = await request(app).get('/api/v1/tours/tour-uuid');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('tour-uuid');
    expect(res.body.data.isBaseline).toBe(true);
  });

  it('❌ 404 — tour not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/tours/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/tours/tour-uuid')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/tours/stores/:storeId/active
// ---------------------------------------------------------------------------
describe('GET /api/v1/tours/stores/:storeId/active', () => {
  it('✅ 200 — returns active tour for the store', async () => {
    mockedGetActive.mockResolvedValueOnce(fakeTour as any);

    const res = await request(app).get('/api/v1/tours/stores/store-uuid/active');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('tour-uuid');
    expect(res.body.data.status).toBe('active');
  });

  it('✅ 200 — returns null when store has no active tour', async () => {
    mockedGetActive.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/tours/stores/store-uuid/active');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/tours/stores/store-uuid/active')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});
