// vi.mock calls MUST come before any other imports — Vitest hoists them.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../shared/middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    if (req.headers['x-test-no-auth']) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = { userId: 'surveyor-uuid', email: 'surveyor@acme.com', emailVerified: true };
    req.isFirstLogin = false;
    next();
  },
}));

vi.mock('../../../shared/middlewares/tenant.middleware', () => ({
  tenantContext: (req: any, _res: any, next: any) => {
    req.orgId = 'org-uuid-1234';
    req.accessMap = {
      orgId: 'org-uuid-1234',
      userId: 'surveyor-uuid',
      roleTemplate: 'surveyor',
      scopeType: 'stores',
      dataScope: { storeIds: ['store-uuid'], zoneIds: [] },
      scopeEntityIds: ['store-uuid'],
      permissions: [
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

vi.mock('../survey.service', () => ({
  startSurvey: vi.fn(),
  submitSurvey: vi.fn(),
  submitScene: vi.fn(),
  submitPhoto: vi.fn(),
  listSurveys: vi.fn(),
  getSurveyById: vi.fn(),
  getMySlots: vi.fn(),
  generateUploadUrl: vi.fn(),
}));

import request from 'supertest';
import app from '../../../app';
import * as surveyService from '../survey.service';

const mockedStart = vi.mocked(surveyService.startSurvey);
const mockedSubmit = vi.mocked(surveyService.submitSurvey);
const mockedAddScene = vi.mocked(surveyService.submitScene);
const mockedAddPhoto = vi.mocked(surveyService.submitPhoto);
const mockedList = vi.mocked(surveyService.listSurveys);
const mockedGetById = vi.mocked(surveyService.getSurveyById);
const mockedMySlots = vi.mocked(surveyService.getMySlots);
const mockedUploadUrl = vi.mocked(surveyService.generateUploadUrl);

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeSurvey = {
  id: 'survey-uuid',
  orgId: 'org-uuid-1234',
  storeId: 'store-uuid',
  scheduleInstanceId: 'slot-uuid',
  surveyorId: 'surveyor-uuid',
  status: 'in_progress',
  startedAt: new Date().toISOString(),
  completedAt: null,
};

const fakeSlot = {
  id: 'slot-uuid',
  storeId: 'store-uuid',
  storeName: 'Test Store',
  scheduledDate: '2026-02-01',
  windowStartUtc: new Date().toISOString(),
  windowEndUtc: new Date().toISOString(),
  status: 'pending',
};

// ---------------------------------------------------------------------------
// GET /api/v1/surveys/my-slots
// ---------------------------------------------------------------------------
describe('GET /api/v1/surveys/my-slots', () => {
  it('✅ 200 — returns slots for the logged-in surveyor', async () => {
    mockedMySlots.mockResolvedValueOnce({
      data: [fakeSlot],
      total: 1,
      page: 1,
      perPage: 25,
      totalPages: 1,
    } as any);

    const res = await request(app).get('/api/v1/surveys/my-slots');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/surveys/my-slots')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/surveys/start
// ---------------------------------------------------------------------------
describe('POST /api/v1/surveys/start', () => {
  const validBody = {
    scheduleInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  };

  it('✅ 201 — starts survey successfully', async () => {
    mockedStart.mockResolvedValueOnce(fakeSurvey as any);

    const res = await request(app)
      .post('/api/v1/surveys/start')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('❌ 404 — slot not found', async () => {
    const err: any = new Error('Schedule slot not found');
    err.statusCode = 404;
    mockedStart.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/v1/surveys/start')
      .send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — slot already completed (409 mapped to 400)', async () => {
    const err: any = new Error('This slot has already been completed');
    err.statusCode = 409;
    mockedStart.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/v1/surveys/start')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — missing scheduleInstanceId', async () => {
    const res = await request(app)
      .post('/api/v1/surveys/start')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/surveys/start')
      .set('x-test-no-auth', 'true')
      .send(validBody);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/surveys/:id/scenes
// ---------------------------------------------------------------------------
describe('POST /api/v1/surveys/:id/scenes', () => {
  const validBody = {
    sceneId: 'scene-123',
    panoramaUrl: 'https://bucket.s3.amazonaws.com/scene.jpg',
    displayOrder: 0,
  };

  it('✅ 201 — submits scene successfully', async () => {
    mockedAddScene.mockResolvedValueOnce({
      id: 'scene-db-uuid',
      surveyId: 'survey-uuid',
      externalSceneId: 'scene-123',
    } as any);

    const res = await request(app)
      .post('/api/v1/surveys/survey-uuid/scenes')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — survey not found', async () => {
    const err: any = new Error('Survey not found');
    err.statusCode = 404;
    mockedAddScene.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/v1/surveys/non-existent/scenes')
      .send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/surveys/survey-uuid/scenes')
      .set('x-test-no-auth', 'true')
      .send(validBody);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/surveys/:id/photos
// ---------------------------------------------------------------------------
describe('POST /api/v1/surveys/:id/photos', () => {
  const validBody = {
    photoUrl: 'https://bucket.s3.amazonaws.com/photo.jpg',
    photoType: 'shelf',
  };

  it('✅ 201 — submits photo successfully', async () => {
    mockedAddPhoto.mockResolvedValueOnce({
      id: 'photo-uuid',
      surveyId: 'survey-uuid',
      photoUrl: validBody.photoUrl,
      photoType: 'shelf',
    } as any);

    const res = await request(app)
      .post('/api/v1/surveys/survey-uuid/photos')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('❌ 404 — survey not found', async () => {
    const err: any = new Error('Survey not found');
    err.statusCode = 404;
    mockedAddPhoto.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/v1/surveys/non-existent/photos')
      .send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/surveys/:id/submit
// ---------------------------------------------------------------------------
describe('POST /api/v1/surveys/:id/submit', () => {
  const validBody = {
    scenes: [
      {
        sceneId: 'scene-123',
        panoramaUrl: 'https://bucket.s3.amazonaws.com/scene.jpg',
        displayOrder: 0,
      },
    ],
    photos: [],
  };

  it('✅ 200 — submits survey successfully', async () => {
    mockedSubmit.mockResolvedValueOnce({ ...fakeSurvey, status: 'completed', completedAt: new Date().toISOString() } as any);

    const res = await request(app)
      .post('/api/v1/surveys/survey-uuid/submit')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
  });

  it('❌ 404 — survey not found', async () => {
    const err: any = new Error('Survey not found');
    err.statusCode = 404;
    mockedSubmit.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/v1/surveys/non-existent/submit')
      .send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 400 — survey already submitted (409 mapped to 400)', async () => {
    const err: any = new Error('Survey already submitted');
    err.statusCode = 409;
    mockedSubmit.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/v1/surveys/survey-uuid/submit')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/surveys/:id/upload-url
// ---------------------------------------------------------------------------
describe('GET /api/v1/surveys/:id/upload-url', () => {
  it('✅ 200 — returns presigned upload URL', async () => {
    mockedUploadUrl.mockReturnValueOnce({
      uploadUrl: 'https://bucket.s3.amazonaws.com/upload?mock=true',
      fileUrl: 'https://bucket.s3.amazonaws.com/file.jpg',
      key: 'surveys/survey-uuid/shelf/123-file.jpg',
      expiresIn: 3600,
      isMock: true,
    });

    const res = await request(app)
      .get('/api/v1/surveys/survey-uuid/upload-url')
      .query({ uploadType: 'shelf', filename: 'file.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadUrl).toContain('mock=true');
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/surveys/survey-uuid/upload-url')
      .set('x-test-no-auth', 'true')
      .query({ uploadType: 'shelf', filename: 'file.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/surveys
// ---------------------------------------------------------------------------
describe('GET /api/v1/surveys', () => {
  it('✅ 200 — returns paginated survey list', async () => {
    mockedList.mockResolvedValueOnce({
      data: [fakeSurvey],
      total: 1,
      page: 1,
      perPage: 25,
      totalPages: 1,
    } as any);

    const res = await request(app).get('/api/v1/surveys');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/surveys')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/surveys/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/surveys/:id', () => {
  it('✅ 200 — returns survey detail', async () => {
    mockedGetById.mockResolvedValueOnce({
      ...fakeSurvey,
      scenes: [],
      photos: [],
      surveyorName: 'Surveyor One',
      storeName: 'Test Store',
    } as any);

    const res = await request(app).get('/api/v1/surveys/survey-uuid');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('survey-uuid');
  });

  it('❌ 404 — survey not found', async () => {
    mockedGetById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/surveys/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('❌ 401 — unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/surveys/survey-uuid')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
  });
});
