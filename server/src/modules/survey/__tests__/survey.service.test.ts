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
  surveys: {},
  surveyScenes: {},
  surveyPhotos: {},
  scheduleInstances: {},
  tours: {},
  scenes: {},
  shelves: {},
  stores: {},
  users: {},
}));

import { db } from '../../../shared/db';
import { startSurvey } from '../survey.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSelectChain(returnValue: unknown[]) {
  const chain = makeChain(returnValue);
  (db.select as any).mockReturnValueOnce(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// startSurvey
// ---------------------------------------------------------------------------
describe('startSurvey()', () => {
  const input = {
    scheduleInstanceId: 'slot-uuid',
    appVersion: '1.0.0',
    deviceInfo: null,
  };

  it('❌ throws 404 when slot not found', async () => {
    // Select slot — not found
    mockSelectChain([]);

    await expect(startSurvey('org-uuid', 'surveyor-uuid', input)).rejects.toMatchObject({
      message: 'Schedule slot not found',
      statusCode: 404,
    });
  });

  it('❌ throws 409 when slot is already completed', async () => {
    mockSelectChain([
      {
        id: 'slot-uuid',
        orgId: 'org-uuid',
        status: 'completed',
        storeId: 'store-uuid',
        windowStartUtc: new Date(Date.now() - 3600000),
        windowEndUtc: new Date(Date.now() + 3600000),
        surveyId: null,
      },
    ]);

    await expect(startSurvey('org-uuid', 'surveyor-uuid', input)).rejects.toMatchObject({
      message: 'This slot has already been completed',
      statusCode: 409,
    });
  });

  it('❌ throws 409 when slot is cancelled', async () => {
    mockSelectChain([
      {
        id: 'slot-uuid',
        orgId: 'org-uuid',
        status: 'cancelled',
        storeId: 'store-uuid',
        windowStartUtc: new Date(Date.now() - 3600000),
        windowEndUtc: new Date(Date.now() + 3600000),
        surveyId: null,
      },
    ]);

    await expect(startSurvey('org-uuid', 'surveyor-uuid', input)).rejects.toMatchObject({
      message: 'Slot is cancelled',
      statusCode: 409,
    });
  });

  it('❌ throws 409 when slot is skipped', async () => {
    mockSelectChain([
      {
        id: 'slot-uuid',
        orgId: 'org-uuid',
        status: 'skipped',
        storeId: 'store-uuid',
        windowStartUtc: new Date(Date.now() - 3600000),
        windowEndUtc: new Date(Date.now() + 3600000),
        surveyId: null,
      },
    ]);

    await expect(startSurvey('org-uuid', 'surveyor-uuid', input)).rejects.toMatchObject({
      message: 'Slot is skipped',
      statusCode: 409,
    });
  });

  it('❌ throws 403 when survey window has not opened yet', async () => {
    mockSelectChain([
      {
        id: 'slot-uuid',
        orgId: 'org-uuid',
        status: 'pending',
        storeId: 'store-uuid',
        windowStartUtc: new Date(Date.now() + 7200000), // 2hrs in the future
        windowEndUtc: new Date(Date.now() + 10800000),
        surveyId: null,
      },
    ]);

    await expect(startSurvey('org-uuid', 'surveyor-uuid', input)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('✅ creates survey when slot is valid and window is open', async () => {
    const pastStart = new Date(Date.now() - 3600000);
    const futureEnd = new Date(Date.now() + 3600000);

    // Select slot — pending, window open
    mockSelectChain([
      {
        id: 'slot-uuid',
        orgId: 'org-uuid',
        status: 'pending',
        storeId: 'store-uuid',
        windowStartUtc: pastStart,
        windowEndUtc: futureEnd,
        surveyId: null,
      },
    ]);

    // Select active tour — none
    mockSelectChain([]);

    // Insert survey
    const insertChain = makeChain([
      {
        id: 'survey-uuid',
        orgId: 'org-uuid',
        storeId: 'store-uuid',
        scheduleInstanceId: 'slot-uuid',
        surveyorId: 'surveyor-uuid',
        status: 'in_progress',
        startedAt: new Date(),
      },
    ]);
    (db.insert as any).mockReturnValueOnce(insertChain);

    // Update slot to in_progress
    const updateChain = makeChain([]);
    (db.update as any).mockReturnValueOnce(updateChain);

    const result = await startSurvey('org-uuid', 'surveyor-uuid', input);

    expect(result).toMatchObject({ id: 'survey-uuid', status: 'in_progress' });
  });
});
