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
        'employees:manage',
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

vi.mock('../schedule.service', () => ({
  createTemplate: vi.fn(),
  listTemplates: vi.fn(),
  getTemplateById: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
  createWindow: vi.fn(),
  updateWindow: vi.fn(),
  deleteWindow: vi.fn(),
  listSlots: vi.fn(),
  getSlotById: vi.fn(),
  assignSurveyor: vi.fn(),
  updateSlotStatus: vi.fn(),
  listAssignments: vi.fn(),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  getStoreEffectiveTemplate: vi.fn(),
  previewSlots: vi.fn(),
  triggerManualMaterialize: vi.fn(),
}));

vi.mock('../schedule.materializer', () => ({
  materializeTemplate: vi.fn(),
  materializeForStore: vi.fn(),
  doesDateMatchRule: vi.fn(),
  getMaterializationWindow: vi.fn().mockReturnValue({ startDate: '2026-01-01', endDate: '2026-03-31' }),
}));

import request from 'supertest';
import app from '../../../app';
import * as scheduleService from '../schedule.service';

const mockedCreateTemplate = vi.mocked(scheduleService.createTemplate);
const mockedListTemplates = vi.mocked(scheduleService.listTemplates);
const mockedGetTemplateById = vi.mocked(scheduleService.getTemplateById);
const mockedUpdateTemplate = vi.mocked(scheduleService.updateTemplate);
const mockedDeleteTemplate = vi.mocked(scheduleService.deleteTemplate);
const mockedCreateRule = vi.mocked(scheduleService.createRule);
const mockedUpdateRule = vi.mocked(scheduleService.updateRule);
const mockedDeleteRule = vi.mocked(scheduleService.deleteRule);
const mockedCreateWindow = vi.mocked(scheduleService.createWindow);
const mockedUpdateWindow = vi.mocked(scheduleService.updateWindow);
const mockedDeleteWindow = vi.mocked(scheduleService.deleteWindow);
const mockedListSlots = vi.mocked(scheduleService.listSlots);
const mockedGetSlotById = vi.mocked(scheduleService.getSlotById);
const mockedAssignSurveyor = vi.mocked(scheduleService.assignSurveyor);
const mockedUpdateSlotStatus = vi.mocked(scheduleService.updateSlotStatus);
const mockedListAssignments = vi.mocked(scheduleService.listAssignments);
const mockedCreateAssignment = vi.mocked(scheduleService.createAssignment);
const mockedDeleteAssignment = vi.mocked(scheduleService.deleteAssignment);
const mockedGetStoreTemplate = vi.mocked(scheduleService.getStoreEffectiveTemplate);
const mockedPreviewSlots = vi.mocked(scheduleService.previewSlots);
const mockedMaterialize = vi.mocked(scheduleService.triggerManualMaterialize);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeTemplate = {
  id: 'template-uuid',
  orgId: 'org-uuid-1234',
  storeId: null,
  name: 'Weekly Template',
  timezone: 'Asia/Kolkata',
  effectiveFrom: '2026-01-01',
  effectiveUntil: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  rules: [],
};

const fakeRule = {
  id: 'rule-uuid',
  orgId: 'org-uuid-1234',
  scheduleTemplateId: 'template-uuid',
  recurrenceType: 'daily',
  daysOfWeek: null,
  intervalValue: null,
  intervalUnit: null,
};

const fakeWindow = {
  id: 'window-uuid',
  orgId: 'org-uuid-1234',
  recurrenceRuleId: 'rule-uuid',
  windowStart: '09:00:00',
  windowEnd: '12:00:00',
  label: 'Morning',
  displayOrder: 1,
};

const fakeSlot = {
  id: 'slot-uuid',
  orgId: 'org-uuid-1234',
  storeId: 'store-uuid',
  storeName: 'Test Store',
  status: 'pending',
  scheduledDate: '2026-02-01',
  windowStartUtc: new Date().toISOString(),
  windowEndUtc: new Date().toISOString(),
};

const fakeAssignment = {
  id: 'assign-uuid',
  orgId: 'org-uuid-1234',
  storeId: 'store-uuid',
  surveyorId: 'emp-uuid',
  recurrenceRuleId: 'rule-uuid',
  timeWindowId: 'window-uuid',
};

// ---------------------------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------------------------
describe('POST /api/v1/schedules/templates', () => {
  const validBody = {
    name: 'Weekly Template',
    timezone: 'Asia/Kolkata',
    effectiveFrom: '2026-01-01',
  };

  it('✅ 201 — creates template', async () => {
    mockedCreateTemplate.mockResolvedValueOnce(fakeTemplate as any);

    const res = await request(app)
      .post('/api/v1/schedules/templates')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Weekly Template');
  });

  it('❌ 400 — missing name', async () => {
    const res = await request(app)
      .post('/api/v1/schedules/templates')
      .send({ timezone: 'Asia/Kolkata', effectiveFrom: '2026-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/schedules/templates')
      .set('x-test-no-auth', 'true')
      .send(validBody);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/schedules/templates', () => {
  it('✅ 200 — returns template list', async () => {
    mockedListTemplates.mockResolvedValueOnce([fakeTemplate] as any);

    const res = await request(app).get('/api/v1/schedules/templates');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/schedules/templates')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/schedules/templates/default', () => {
  it('✅ 200 — returns org-default template', async () => {
    mockedListTemplates.mockResolvedValueOnce([fakeTemplate] as any);
    mockedGetTemplateById.mockResolvedValueOnce({ ...fakeTemplate, rules: [] } as any);

    const res = await request(app).get('/api/v1/schedules/templates/default');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — no active org-default template', async () => {
    mockedListTemplates.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/v1/schedules/templates/default');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/v1/schedules/templates/:id', () => {
  it('✅ 200 — returns template detail', async () => {
    mockedGetTemplateById.mockResolvedValueOnce(fakeTemplate as any);

    const res = await request(app).get('/api/v1/schedules/templates/template-uuid');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('template-uuid');
  });

  it('❌ 404 — template not found', async () => {
    mockedGetTemplateById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/schedules/templates/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/schedules/templates/:id', () => {
  it('✅ 200 — updates template', async () => {
    mockedUpdateTemplate.mockResolvedValueOnce({ ...fakeTemplate, name: 'Updated' } as any);

    const res = await request(app)
      .patch('/api/v1/schedules/templates/template-uuid')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — template not found', async () => {
    mockedUpdateTemplate.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/schedules/templates/non-existent')
      .send({ name: 'XX' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/v1/schedules/templates/:id', () => {
  it('✅ 200 — deletes template', async () => {
    mockedDeleteTemplate.mockResolvedValueOnce(true);

    const res = await request(app).delete('/api/v1/schedules/templates/template-uuid');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — template not found', async () => {
    mockedDeleteTemplate.mockResolvedValueOnce(false);

    const res = await request(app).delete('/api/v1/schedules/templates/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/schedules/templates/:id/preview', () => {
  it('✅ 200 — returns preview slots', async () => {
    mockedPreviewSlots.mockResolvedValueOnce([
      { date: '2026-02-02', windowStart: '2026-02-02T03:30:00.000Z', windowEnd: '2026-02-02T06:30:00.000Z', timezone: 'Asia/Kolkata', label: null },
    ]);

    const res = await request(app)
      .post('/api/v1/schedules/templates/template-uuid/preview')
      .send({ dateFrom: '2026-02-01', dateTo: '2026-02-07' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('❌ 404 — template not found', async () => {
    mockedPreviewSlots.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/schedules/templates/non-existent/preview')
      .send({ dateFrom: '2026-02-01', dateTo: '2026-02-07' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/schedules/templates/:id/materialize', () => {
  it('✅ 200 — materializes template', async () => {
    mockedMaterialize.mockResolvedValueOnce({ created: 5, skipped: 2 } as any);

    const res = await request(app).post('/api/v1/schedules/templates/template-uuid/materialize');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — template not found', async () => {
    mockedMaterialize.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/v1/schedules/templates/non-existent/materialize');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RULES
// ---------------------------------------------------------------------------
describe('POST /api/v1/schedules/templates/:id/rules', () => {
  it('✅ 201 — creates rule', async () => {
    mockedCreateRule.mockResolvedValueOnce(fakeRule as any);

    const res = await request(app)
      .post('/api/v1/schedules/templates/template-uuid/rules')
      .send({ recurrenceType: 'daily' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recurrenceType).toBe('daily');
  });

  it('❌ 404 — template not found', async () => {
    mockedCreateRule.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/schedules/templates/non-existent/rules')
      .send({ recurrenceType: 'daily' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — missing recurrenceType', async () => {
    const res = await request(app)
      .post('/api/v1/schedules/templates/template-uuid/rules')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/schedules/templates/:id/rules/:ruleId', () => {
  it('✅ 200 — updates rule', async () => {
    mockedUpdateRule.mockResolvedValueOnce({ ...fakeRule, recurrenceType: 'weekdays' } as any);

    const res = await request(app)
      .patch('/api/v1/schedules/templates/template-uuid/rules/rule-uuid')
      .send({ recurrenceType: 'weekdays' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — rule not found', async () => {
    mockedUpdateRule.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/schedules/templates/template-uuid/rules/non-existent')
      .send({ recurrenceType: 'weekdays' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/v1/schedules/templates/:id/rules/:ruleId', () => {
  it('✅ 200 — deletes rule', async () => {
    mockedDeleteRule.mockResolvedValueOnce(true);

    const res = await request(app).delete('/api/v1/schedules/templates/template-uuid/rules/rule-uuid');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — rule not found', async () => {
    mockedDeleteRule.mockResolvedValueOnce(false);

    const res = await request(app).delete('/api/v1/schedules/templates/template-uuid/rules/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WINDOWS
// ---------------------------------------------------------------------------
describe('POST /api/v1/schedules/templates/:id/rules/:ruleId/windows', () => {
  const windowBody = { windowStart: '09:00', windowEnd: '12:00', displayOrder: 1 };

  it('✅ 201 — creates window', async () => {
    mockedCreateWindow.mockResolvedValueOnce(fakeWindow as any);

    const res = await request(app)
      .post('/api/v1/schedules/templates/template-uuid/rules/rule-uuid/windows')
      .send(windowBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.label).toBe('Morning');
  });

  it('❌ 404 — rule not found', async () => {
    mockedCreateWindow.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/schedules/templates/template-uuid/rules/non-existent/windows')
      .send(windowBody);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/schedules/templates/:id/rules/:ruleId/windows/:windowId', () => {
  it('✅ 200 — updates window', async () => {
    mockedUpdateWindow.mockResolvedValueOnce({ ...fakeWindow, label: 'Afternoon' } as any);

    const res = await request(app)
      .patch('/api/v1/schedules/templates/template-uuid/rules/rule-uuid/windows/window-uuid')
      .send({ label: 'Afternoon' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — window not found', async () => {
    mockedUpdateWindow.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/schedules/templates/template-uuid/rules/rule-uuid/windows/non-existent')
      .send({ label: 'X' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/v1/schedules/templates/:id/rules/:ruleId/windows/:windowId', () => {
  it('✅ 200 — deletes window', async () => {
    mockedDeleteWindow.mockResolvedValueOnce(true);

    const res = await request(app).delete(
      '/api/v1/schedules/templates/template-uuid/rules/rule-uuid/windows/window-uuid',
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — window not found', async () => {
    mockedDeleteWindow.mockResolvedValueOnce(false);

    const res = await request(app).delete(
      '/api/v1/schedules/templates/template-uuid/rules/rule-uuid/windows/non-existent',
    );

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SLOTS
// ---------------------------------------------------------------------------
describe('GET /api/v1/schedules/slots', () => {
  it('✅ 200 — returns paginated slot list', async () => {
    mockedListSlots.mockResolvedValueOnce({
      data: [fakeSlot],
      total: 1,
      page: 1,
      perPage: 25,
      totalPages: 1,
    } as any);

    const res = await request(app).get('/api/v1/schedules/slots');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/schedules/slots')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/schedules/slots/:id', () => {
  it('✅ 200 — returns slot detail', async () => {
    mockedGetSlotById.mockResolvedValueOnce(fakeSlot as any);

    const res = await request(app).get('/api/v1/schedules/slots/slot-uuid');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('slot-uuid');
  });

  it('❌ 404 — slot not found', async () => {
    mockedGetSlotById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/schedules/slots/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/schedules/slots/:id/assign', () => {
  it('✅ 200 — assigns surveyor to slot', async () => {
    mockedAssignSurveyor.mockResolvedValueOnce({ slot: { ...fakeSlot, assignedSurveyorId: 'emp-uuid' } } as any);

    const res = await request(app)
      .patch('/api/v1/schedules/slots/slot-uuid/assign')
      .send({ surveyorId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — slot not found', async () => {
    mockedAssignSurveyor.mockResolvedValueOnce({ error: 'Slot not found' } as any);

    const res = await request(app)
      .patch('/api/v1/schedules/slots/non-existent/assign')
      .send({ surveyorId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 409 — surveyor has conflicting slot', async () => {
    mockedAssignSurveyor.mockResolvedValueOnce({ error: 'Surveyor has a conflicting slot at that time', conflict: true } as any);

    const res = await request(app)
      .patch('/api/v1/schedules/slots/slot-uuid/assign')
      .send({ surveyorId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(409);
    expect(res.body.conflict).toBe(true);
  });
});

describe('PATCH /api/v1/schedules/slots/:id/status', () => {
  it('✅ 200 — updates slot status', async () => {
    mockedUpdateSlotStatus.mockResolvedValueOnce({ ...fakeSlot, status: 'cancelled' } as any);

    const res = await request(app)
      .patch('/api/v1/schedules/slots/slot-uuid/status')
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — slot not found', async () => {
    mockedUpdateSlotStatus.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/schedules/slots/non-existent/status')
      .send({ status: 'cancelled' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ASSIGNMENTS
// ---------------------------------------------------------------------------
describe('GET /api/v1/schedules/assignments', () => {
  it('✅ 200 — returns assignments list', async () => {
    mockedListAssignments.mockResolvedValueOnce([fakeAssignment] as any);

    const res = await request(app).get('/api/v1/schedules/assignments');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/schedules/assignments')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/schedules/assignments', () => {
  const validBody = {
    storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    surveyorId: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
    recurrenceRuleId: '3fa85f64-5717-4562-b3fc-2c963f66afa8',
    timeWindowId: '3fa85f64-5717-4562-b3fc-2c963f66afa9',
  };

  it('✅ 201 — creates assignment', async () => {
    mockedCreateAssignment.mockResolvedValueOnce(fakeAssignment as any);

    const res = await request(app)
      .post('/api/v1/schedules/assignments')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('❌ 400 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/schedules/assignments')
      .send({ storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/schedules/assignments')
      .set('x-test-no-auth', 'true')
      .send(validBody);

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/v1/schedules/assignments/:id', () => {
  it('✅ 200 — deletes assignment', async () => {
    mockedDeleteAssignment.mockResolvedValueOnce(true);

    const res = await request(app).delete('/api/v1/schedules/assignments/assign-uuid');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — assignment not found', async () => {
    mockedDeleteAssignment.mockResolvedValueOnce(false);

    const res = await request(app).delete('/api/v1/schedules/assignments/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// STORE EFFECTIVE TEMPLATE
// ---------------------------------------------------------------------------
describe('GET /api/v1/schedules/stores/:storeId/template', () => {
  it('✅ 200 — returns effective template for store', async () => {
    mockedGetStoreTemplate.mockResolvedValueOnce({ ...fakeTemplate, source: 'org_default' } as any);

    const res = await request(app).get('/api/v1/schedules/stores/store-uuid/template');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('org_default');
  });

  it('❌ 404 — no active template for store', async () => {
    mockedGetStoreTemplate.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/schedules/stores/store-uuid/template');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/schedules/stores/store-uuid/template')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});
