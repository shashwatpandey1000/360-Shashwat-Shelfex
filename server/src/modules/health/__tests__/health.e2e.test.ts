import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../../app';

describe('GET /api/v1/health', () => {
  it('returns 200 with status UP', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
  });

  it('includes timestamp and service name in response', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(typeof res.body.data.timestamp).toBe('string');
    expect(res.body.data.service).toBe('shelf360-api');
  });

  it('does not require authentication', async () => {
    // No auth headers — should still return 200
    const res = await request(app)
      .get('/api/v1/health')
      .set('x-test-no-auth', 'true');
    expect(res.status).toBe(200);
  });
});
