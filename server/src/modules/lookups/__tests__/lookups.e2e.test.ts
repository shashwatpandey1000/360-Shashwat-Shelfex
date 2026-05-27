// vi.mock calls MUST come before any other imports — Vitest hoists them.
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { makeChain } from '../../../__tests__/helpers/db.mock';

// ── Inline DB mock for lookups (no auth, direct db calls in controller) ──────
vi.mock('../../../shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../shared/db/schema', () => ({
  industries: {},
  storeCategories: {},
}));

import { db } from '../../../shared/db';
import request from 'supertest';
import app from '../../../app';

beforeEach(() => {
  vi.clearAllMocks();
});

function mockSelectChain(returnValue: unknown[]) {
  const chain = makeChain(returnValue);
  (db.select as any).mockReturnValueOnce(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// GET /api/v1/lookups/industries
// ---------------------------------------------------------------------------
describe('GET /api/v1/lookups/industries', () => {
  it('✅ 200 — returns array of industries', async () => {
    mockSelectChain([
      { id: 'industry-uuid-1', name: 'Retail' },
      { id: 'industry-uuid-2', name: 'FMCG' },
    ]);

    const res = await request(app).get('/api/v1/lookups/industries');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('Retail');
  });

  it('✅ 200 — returns empty array when no industries', async () => {
    mockSelectChain([]);

    const res = await request(app).get('/api/v1/lookups/industries');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('✅ does not require authentication', async () => {
    mockSelectChain([{ id: 'industry-uuid-1', name: 'Retail' }]);

    // No auth headers at all — lookups are public
    const res = await request(app).get('/api/v1/lookups/industries');

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/lookups/store-categories
// ---------------------------------------------------------------------------
describe('GET /api/v1/lookups/store-categories', () => {
  it('✅ 200 — returns array of store categories', async () => {
    mockSelectChain([
      { id: 'cat-uuid-1', name: 'Supermarket' },
      { id: 'cat-uuid-2', name: 'Convenience Store' },
    ]);

    const res = await request(app).get('/api/v1/lookups/store-categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('Supermarket');
  });

  it('✅ 200 — returns empty array when no categories', async () => {
    mockSelectChain([]);

    const res = await request(app).get('/api/v1/lookups/store-categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('✅ does not require authentication', async () => {
    mockSelectChain([{ id: 'cat-uuid-1', name: 'Supermarket' }]);

    const res = await request(app).get('/api/v1/lookups/store-categories');

    expect(res.status).toBe(200);
  });
});
