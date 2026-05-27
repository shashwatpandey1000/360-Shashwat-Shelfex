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

vi.mock('../store.service', () => ({
  createStore: vi.fn(),
  listStores: vi.fn(),
  getStoreById: vi.fn(),
  updateStore: vi.fn(),
  deactivateStore: vi.fn(),
  bulkImportStores: vi.fn(),
}));

vi.mock('../../employee/employee.service', () => ({
  createEmployee: vi.fn(),
  listEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  updateEmployee: vi.fn(),
  deactivateEmployee: vi.fn(),
  reactivateEmployee: vi.fn(),
  assignStoreManager: vi.fn(),
}));

import request from 'supertest';
import app from '../../../app';
import * as storeService from '../store.service';
import * as employeeService from '../../employee/employee.service';

const mockedCreate = vi.mocked(storeService.createStore);
const mockedList = vi.mocked(storeService.listStores);
const mockedGetById = vi.mocked(storeService.getStoreById);
const mockedUpdate = vi.mocked(storeService.updateStore);
const mockedDeactivate = vi.mocked(storeService.deactivateStore);
const mockedBulkImport = vi.mocked(storeService.bulkImportStores);
const mockedAssignStoreManager = vi.mocked(employeeService.assignStoreManager);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeStore = {
  id: 'store-uuid-1',
  orgId: 'org-uuid-1234',
  name: 'Test Store',
  slug: 'test-store',
  status: 'active',
  address: { city: 'Mumbai', country: 'IN' },
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// POST /api/v1/stores
// ---------------------------------------------------------------------------
describe('POST /api/v1/stores', () => {
  const validBody = {
    name: 'Test Store',
    address: { city: 'Mumbai', country: 'IN' },
  };

  it('✅ 201 — creates store', async () => {
    mockedCreate.mockResolvedValueOnce(fakeStore as any);

    const res = await request(app)
      .post('/api/v1/stores')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Store');
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/stores')
      .set('x-test-no-auth', 'true')
      .send(validBody);

    expect(res.status).toBe(401);
  });

  it('❌ 400 — missing required name field', async () => {
    const res = await request(app)
      .post('/api/v1/stores')
      .send({ address: { city: 'Mumbai' } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 403 — no permission', async () => {
    const res = await request(app)
      .post('/api/v1/stores')
      .set('x-test-no-permission', 'true')
      .send(validBody);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/stores
// ---------------------------------------------------------------------------
describe('GET /api/v1/stores', () => {
  it('✅ 200 — returns paginated store list', async () => {
    mockedList.mockResolvedValueOnce({
      data: [fakeStore],
      total: 1,
      page: 1,
      perPage: 25,
      totalPages: 1,
    } as any);

    const res = await request(app).get('/api/v1/stores');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/stores')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/stores/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/stores/:id', () => {
  it('✅ 200 — returns store detail', async () => {
    mockedGetById.mockResolvedValueOnce(fakeStore as any);

    const res = await request(app).get('/api/v1/stores/store-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('store-uuid-1');
  });

  it('❌ 404 — store not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/stores/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/stores/store-uuid-1')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/stores/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/v1/stores/:id', () => {
  it('✅ 200 — updates store', async () => {
    // First call: getStoreById to verify store exists and is in scope
    mockedGetById.mockResolvedValueOnce(fakeStore as any);
    // Second call: updateStore
    mockedUpdate.mockResolvedValueOnce({ ...fakeStore, name: 'Updated Store' } as any);

    const res = await request(app)
      .patch('/api/v1/stores/store-uuid-1')
      .send({ name: 'Updated Store' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Store');
  });

  it('❌ 404 — store not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/stores/non-existent')
      .send({ name: 'XX' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/v1/stores/store-uuid-1')
      .set('x-test-no-auth', 'true')
      .send({ name: 'X' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/stores/:id/deactivate
// ---------------------------------------------------------------------------
describe('POST /api/v1/stores/:id/deactivate', () => {
  it('✅ 200 — deactivates store', async () => {
    // getStoreById confirms store is accessible and not already inactive
    mockedGetById.mockResolvedValueOnce(fakeStore as any);
    mockedDeactivate.mockResolvedValueOnce({ ...fakeStore, status: 'inactive' } as any);

    const res = await request(app).post('/api/v1/stores/store-uuid-1/deactivate');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('inactive');
  });

  it('❌ 404 — store not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/v1/stores/non-existent/deactivate');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — store is already inactive', async () => {
    mockedGetById.mockResolvedValueOnce({ ...fakeStore, status: 'inactive' } as any);

    const res = await request(app).post('/api/v1/stores/store-uuid-1/deactivate');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already inactive');
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/stores/store-uuid-1/deactivate')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/stores/bulk-import
// ---------------------------------------------------------------------------
describe('POST /api/v1/stores/bulk-import', () => {
  const csvContent = `store_name,city,state,postal_code,country,contact_phone,contact_email,zone_name,manager_name,manager_email
Store One,Mumbai,MH,400001,IN,+91 98765 43210,store1@acme.com,,Manager One,manager1@acme.com`;

  it('✅ 201 — bulk imports stores from CSV', async () => {
    mockedBulkImport.mockResolvedValueOnce({
      created: [{ storeName: 'Store One', managerEmail: 'manager1@acme.com', isNewManager: true }],
      failed: [],
    });

    const res = await request(app)
      .post('/api/v1/stores/bulk-import')
      .attach('file', Buffer.from(csvContent), { filename: 'stores.csv', contentType: 'text/csv' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.created).toBe(1);
  });

  it('❌ 400 — no file uploaded', async () => {
    const res = await request(app).post('/api/v1/stores/bulk-import');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/stores/bulk-import')
      .set('x-test-no-auth', 'true')
      .attach('file', Buffer.from(csvContent), { filename: 'stores.csv', contentType: 'text/csv' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/stores/:storeId/manager
// ---------------------------------------------------------------------------
describe('POST /api/v1/stores/:storeId/manager', () => {
  it('✅ 200 — assigns store manager', async () => {
    mockedAssignStoreManager.mockResolvedValueOnce({
      id: 'store-uuid-1',
      managerId: 'emp-uuid-1',
    } as any);

    const res = await request(app)
      .post('/api/v1/stores/store-uuid-1/manager')
      .send({ employeeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 400 — employee not found (service throws)', async () => {
    mockedAssignStoreManager.mockRejectedValueOnce(new Error('Employee not found'));

    const res = await request(app)
      .post('/api/v1/stores/store-uuid-1/manager')
      .send({ employeeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Employee not found');
  });

  it('❌ 400 — invalid employeeId (not a UUID)', async () => {
    const res = await request(app)
      .post('/api/v1/stores/store-uuid-1/manager')
      .send({ employeeId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/stores/store-uuid-1/manager')
      .set('x-test-no-auth', 'true')
      .send({ employeeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(401);
  });
});
