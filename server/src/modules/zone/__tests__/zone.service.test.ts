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
  zones: {},
  stores: {},
}));

import { db } from '../../../shared/db';
import { createZone, deleteZone } from '../zone.service';

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

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createZone
// ---------------------------------------------------------------------------
describe('createZone()', () => {
  it('✅ creates zone successfully without a parent', async () => {
    const newZone = {
      id: 'zone-uuid',
      orgId: 'org-uuid',
      name: 'North Region',
      description: null,
      parentZoneId: null,
    };
    mockInsertChain([newZone]);

    const result = await createZone('org-uuid', {
      name: 'North Region',
    });

    expect(result).toMatchObject({ id: 'zone-uuid', name: 'North Region' });
  });

  it('✅ creates zone with a valid parent zone', async () => {
    // Check parent zone exists
    mockSelectChain([{ id: 'parent-zone-uuid' }]);

    const newZone = {
      id: 'child-zone-uuid',
      orgId: 'org-uuid',
      name: 'Sub Region',
      parentZoneId: 'parent-zone-uuid',
    };
    mockInsertChain([newZone]);

    const result = await createZone('org-uuid', {
      name: 'Sub Region',
      parentZoneId: 'parent-zone-uuid',
    });

    expect(result).toMatchObject({ id: 'child-zone-uuid', parentZoneId: 'parent-zone-uuid' });
  });

  it('❌ throws Parent zone not found when parent does not belong to org', async () => {
    // Check parent zone — not found in this org
    mockSelectChain([]);

    await expect(
      createZone('org-uuid', {
        name: 'Sub Region',
        parentZoneId: 'foreign-zone-uuid',
      }),
    ).rejects.toThrow('Parent zone not found');
  });
});

// ---------------------------------------------------------------------------
// deleteZone
// ---------------------------------------------------------------------------
describe('deleteZone()', () => {
  it('✅ deletes zone when no children and no stores', async () => {
    // Check child zones — none
    mockSelectChain([]);
    // Check assigned stores — none
    mockSelectChain([]);

    const deletedZone = { id: 'zone-uuid', name: 'North Region' };
    const chain = makeChain([deletedZone]);
    (db.delete as any).mockReturnValueOnce(chain);

    const result = await deleteZone('org-uuid', 'zone-uuid');

    expect(result).toMatchObject({ id: 'zone-uuid' });
  });

  it('❌ throws when zone has child zones', async () => {
    // Check child zones — found
    mockSelectChain([{ id: 'child-zone' }]);

    await expect(deleteZone('org-uuid', 'zone-uuid')).rejects.toThrow(
      'Cannot delete a zone that has sub-zones',
    );
  });

  it('❌ throws when zone has stores assigned', async () => {
    // Check child zones — none
    mockSelectChain([]);
    // Check assigned stores — found
    mockSelectChain([{ id: 'store-uuid' }]);

    await expect(deleteZone('org-uuid', 'zone-uuid')).rejects.toThrow(
      'Cannot delete a zone that has stores assigned',
    );
  });

  it('✅ returns null when zone not found', async () => {
    // Check child zones — none
    mockSelectChain([]);
    // Check assigned stores — none
    mockSelectChain([]);

    const chain = makeChain([]);
    (db.delete as any).mockReturnValueOnce(chain);

    const result = await deleteZone('org-uuid', 'non-existent');

    expect(result).toBeNull();
  });
});
