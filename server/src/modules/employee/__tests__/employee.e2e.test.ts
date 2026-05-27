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

vi.mock('../employee.service', () => ({
  createEmployee: vi.fn(),
  listEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  updateEmployee: vi.fn(),
  deactivateEmployee: vi.fn(),
  reactivateEmployee: vi.fn(),
  assignStoreManager: vi.fn(),
}));

vi.mock('../../org', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../org')>();
  return {
    ...actual,
    getOrgSettings: vi.fn().mockResolvedValue({ id: 'org-uuid-1234', name: 'ACME' }),
  };
});

import request from 'supertest';
import app from '../../../app';
import * as employeeService from '../employee.service';

const mockedCreate = vi.mocked(employeeService.createEmployee);
const mockedList = vi.mocked(employeeService.listEmployees);
const mockedGetById = vi.mocked(employeeService.getEmployeeById);
const mockedUpdate = vi.mocked(employeeService.updateEmployee);
const mockedDeactivate = vi.mocked(employeeService.deactivateEmployee);
const mockedReactivate = vi.mocked(employeeService.reactivateEmployee);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeEmployee = {
  id: 'emp-uuid-1',
  email: 'emp@acme.com',
  name: 'Jane Doe',
  roleTemplate: 'surveyor',
  scopeType: 'stores',
  status: 'pending_first_login',
  orgId: 'org-uuid-1234',
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// POST /api/v1/employees
// ---------------------------------------------------------------------------
describe('POST /api/v1/employees', () => {
  const validBody = {
    email: 'emp@acme.com',
    name: 'Jane Doe',
    roleTemplate: 'surveyor',
    scopeType: 'stores',
    scopeEntityIds: [],
  };

  it('✅ 201 — creates employee', async () => {
    mockedCreate.mockResolvedValueOnce(fakeEmployee as any);

    const res = await request(app)
      .post('/api/v1/employees')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('emp@acme.com');
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('x-test-no-auth', 'true')
      .send(validBody);

    expect(res.status).toBe(401);
  });

  it('❌ 400 — invalid body (missing email)', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .send({ name: 'Jane Doe', roleTemplate: 'surveyor', scopeType: 'stores' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — service throws (privilege escalation)', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('A surveyor cannot create a user with role org_manager'));

    const res = await request(app)
      .post('/api/v1/employees')
      .send({ ...validBody, roleTemplate: 'org_manager', scopeType: 'org' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 403 — forbidden (no permission)', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('x-test-no-permission', 'true')
      .send(validBody);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/employees
// ---------------------------------------------------------------------------
describe('GET /api/v1/employees', () => {
  it('✅ 200 — returns paginated list', async () => {
    mockedList.mockResolvedValueOnce({
      data: [fakeEmployee],
      total: 1,
      page: 1,
      perPage: 25,
      totalPages: 1,
    } as any);

    const res = await request(app).get('/api/v1/employees');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/employees')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/employees/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/employees/:id', () => {
  it('✅ 200 — returns employee detail', async () => {
    mockedGetById.mockResolvedValueOnce({ ...fakeEmployee, permissions: [], scopeEntityIds: [] } as any);

    const res = await request(app).get('/api/v1/employees/emp-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('emp-uuid-1');
  });

  it('❌ 404 — employee not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/employees/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/employees/emp-uuid-1')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/employees/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/v1/employees/:id', () => {
  it('✅ 200 — updates employee', async () => {
    mockedUpdate.mockResolvedValueOnce({ ...fakeEmployee, name: 'Jane Updated' } as any);

    const res = await request(app)
      .patch('/api/v1/employees/emp-uuid-1')
      .send({ name: 'Jane Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Jane Updated');
  });

  it('❌ 404 — employee not found', async () => {
    mockedUpdate.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/employees/non-existent')
      .send({ name: 'X' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/v1/employees/emp-uuid-1')
      .set('x-test-no-auth', 'true')
      .send({ name: 'X' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/employees/:id/deactivate
// ---------------------------------------------------------------------------
describe('POST /api/v1/employees/:id/deactivate', () => {
  it('✅ 200 — deactivates employee', async () => {
    mockedDeactivate.mockResolvedValueOnce({ ...fakeEmployee, status: 'inactive' } as any);

    const res = await request(app).post('/api/v1/employees/emp-uuid-1/deactivate');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('inactive');
  });

  it('❌ 404 — employee not found', async () => {
    mockedDeactivate.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/v1/employees/non-existent/deactivate');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/employees/emp-uuid-1/deactivate')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/employees/:id/reactivate
// ---------------------------------------------------------------------------
describe('POST /api/v1/employees/:id/reactivate', () => {
  it('✅ 200 — reactivates employee', async () => {
    mockedReactivate.mockResolvedValueOnce({ ...fakeEmployee, status: 'active' } as any);

    const res = await request(app).post('/api/v1/employees/emp-uuid-1/reactivate');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
  });

  it('❌ 404 — employee not found', async () => {
    mockedReactivate.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/v1/employees/non-existent/reactivate');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/employees/emp-uuid-1/reactivate')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});
