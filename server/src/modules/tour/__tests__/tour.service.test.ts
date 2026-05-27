import { vi, describe, it, expect, beforeEach } from 'vitest';
import { makeChain } from '../../../__tests__/helpers/db.mock';

// ── DB mock ─────────────────────────────────────────────────────────────────
vi.mock('../../../shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../shared/db/schema', () => ({
  tours: {},
  scenes: {},
  shelves: {},
  stores: {},
}));

import { db } from '../../../shared/db';
import { syncTour } from '../tour.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSelectChain(returnValue: unknown[]) {
  const chain = makeChain(returnValue);
  (db.select as any).mockReturnValueOnce(chain);
  return chain;
}

function mockInsertChain(returnValue: unknown[]) {
  const chain = makeChain(returnValue);
  (db.insert as any).mockReturnValueOnce(chain);
  return chain;
}

function mockUpdateChain(returnValue: unknown[]) {
  const chain = makeChain(returnValue);
  (db.update as any).mockReturnValueOnce(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// syncTour
// ---------------------------------------------------------------------------
describe('syncTour()', () => {
  const validInput = {
    storeId: 'store-uuid',
    capturedAt: new Date().toISOString(),
    appVersion: '2.0.0',
    scenes: [
      {
        sceneId: 'scene-ext-1',
        panoramaUrl: 'https://cdn.example.com/scene1.jpg',
        thumbnailUrl: null,
        heading: 90,
        latitude: 19.076,
        longitude: 72.877,
        label: 'Entrance',
        displayOrder: 0,
        floor: 1,
      },
    ],
    shelves: [],
  };

  it('❌ throws 404 when store not found in org', async () => {
    // Select store — not found
    mockSelectChain([]);

    await expect(syncTour('org-uuid', validInput, 'user-uuid')).rejects.toMatchObject({
      message: 'Store not found',
      statusCode: 404,
    });
  });

  it('✅ syncs a tour successfully (first version — becomes baseline)', async () => {
    // Select store — found
    mockSelectChain([{ id: 'store-uuid', status: 'pending_tour' }]);
    // Archive existing active tours
    mockUpdateChain([]);
    // Count existing tours — returns 0
    mockSelectChain([{ total: 0 }]);
    // Insert tour
    mockInsertChain([
      {
        id: 'tour-uuid',
        orgId: 'org-uuid',
        storeId: 'store-uuid',
        version: 1,
        status: 'active',
        isBaseline: true,
        sceneCount: 1,
        shelfCount: 0,
      },
    ]);
    // Insert scenes
    mockInsertChain([{ id: 'scene-db-uuid', externalSceneId: 'scene-ext-1' }]);
    // Activate store (was pending_tour)
    mockUpdateChain([]);

    const result = await syncTour('org-uuid', validInput, 'user-uuid');

    expect(result).toMatchObject({
      tourId: 'tour-uuid',
      version: 1,
      isBaseline: true,
      sceneCount: 1,
    });
  });

  it('✅ syncs second tour (not baseline, previous is archived)', async () => {
    // Select store — found, already active
    mockSelectChain([{ id: 'store-uuid', status: 'active' }]);
    // Archive existing active tours
    mockUpdateChain([]);
    // Count existing tours — returns 1
    mockSelectChain([{ total: 1 }]);
    // Insert tour
    mockInsertChain([
      {
        id: 'tour-uuid-v2',
        orgId: 'org-uuid',
        storeId: 'store-uuid',
        version: 2,
        status: 'active',
        isBaseline: false,
        sceneCount: 1,
        shelfCount: 0,
      },
    ]);
    // Insert scenes
    mockInsertChain([{ id: 'scene-db-uuid-2', externalSceneId: 'scene-ext-1' }]);

    const result = await syncTour('org-uuid', validInput, 'user-uuid');

    expect(result).toMatchObject({
      version: 2,
      isBaseline: false,
    });
  });
});
