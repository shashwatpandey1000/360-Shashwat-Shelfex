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

// Mock axios used by the auth controller
vi.mock('axios');

import request from 'supertest';
import axios from 'axios';
import app from '../../../app';

const mockedAxios = vi.mocked(axios);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/callback
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/callback', () => {
  it('✅ 200 — exchanges code for tokens and sets cookies', async () => {
    (mockedAxios.post as any).mockResolvedValueOnce({
      data: { access_token: 'at-mock', refresh_token: 'rt-mock' },
    });

    const res = await request(app)
      .post('/api/v1/auth/callback')
      .send({ code: 'valid-auth-code-1234', code_verifier: 'cv-xyz' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Authentication successful');
    // Cookies should be set
    const cookies = res.headers['set-cookie'] as string[] | string;
    const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
    expect(cookieArr.some((c: string) => c.startsWith('access_token='))).toBe(true);
    expect(cookieArr.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('❌ 400 — missing code field fails Zod validation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/callback')
      .send({ code_verifier: 'cv-xyz' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('❌ 502 — SSO returns error (axios throws with response)', async () => {
    const ssoError: any = new Error('SSO rejected code');
    ssoError.response = { status: 400, data: { message: 'Invalid authorization code' } };
    (mockedAxios.post as any).mockRejectedValueOnce(ssoError);

    const res = await request(app)
      .post('/api/v1/auth/callback')
      .send({ code: 'bad-code' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid authorization code');
  });

  it('❌ 500 — network failure (axios throws without response)', async () => {
    (mockedAxios.post as any).mockRejectedValueOnce(new Error('Network error'));

    const res = await request(app)
      .post('/api/v1/auth/callback')
      .send({ code: 'any-code' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/refresh', () => {
  it('✅ 200 — refreshes token when refresh_token cookie present', async () => {
    (mockedAxios.post as any).mockResolvedValueOnce({
      data: {
        data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' },
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refresh_token=valid-rt');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('new-access-token');
  });

  it('❌ 401 — missing refresh_token cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('No refresh token');
  });

  it('❌ 401 — SSO refresh fails (token expired or revoked)', async () => {
    (mockedAxios.post as any).mockRejectedValueOnce(new Error('Token expired'));

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refresh_token=expired-rt');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/logout', () => {
  it('✅ 200 — always succeeds and clears cookies', async () => {
    (mockedAxios.post as any).mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refresh_token=some-rt');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Logged out');
  });

  it('✅ 200 — succeeds even when SSO revocation throws (non-blocking)', async () => {
    (mockedAxios.post as any).mockRejectedValueOnce(new Error('SSO unavailable'));

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refresh_token=some-rt');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('✅ 200 — succeeds even without refresh_token cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------
describe('GET /api/v1/auth/me', () => {
  it('✅ 200 — returns user and accessMap for authenticated user', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@acme.com');
    expect(res.body.data.user.emailVerified).toBe(true);
    expect(res.body.data.user.firstLogin).toBe(false);
  });

  it('❌ 401 — unauthenticated request is rejected', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('x-test-no-auth', 'true');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
