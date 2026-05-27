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
  stores: {},
  users: {},
  storeCategories: {},
  zones: {},
  organizations: {},
  roleTemplates: {},
  roleTemplatePermissions: {},
  userPermissions: {},
  userDataScopes: {},
}));

vi.mock('../../../shared/services/email.service', () => ({
  sendEmployeeInviteEmail: vi.fn(),
}));

import { db } from '../../../shared/db';
import { createStore, deactivateStore, getStoreById } from '../store.service';

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
// createStore — tests slug generation indirectly
// ---------------------------------------------------------------------------
describe('createStore()', () => {
  it('✅ creates a store with a generated slug', async () => {
    // uniqueSlug check — slug "test-store" does not exist
    mockSelectChain([]);

    const newStore = {
      id: 'store-uuid',
      orgId: 'org-uuid',
      name: 'Test Store',
      slug: 'test-store',
      status: 'pending_tour',
      address: { city: 'Mumbai' },
    };
    mockInsertChain([newStore]);

    const result = await createStore('org-uuid', {
      name: 'Test Store',
      address: { city: 'Mumbai', country: 'IN' },
    } as any);

    expect(result).toMatchObject({ name: 'Test Store', slug: 'test-store' });
  });

  it('✅ appends suffix when slug is already taken', async () => {
    // First uniqueSlug check — slug "test-store" exists
    mockSelectChain([{ id: 'existing-store' }]);
    // Second check — slug "test-store-1" is available
    mockSelectChain([]);

    const newStore = {
      id: 'store-uuid-2',
      orgId: 'org-uuid',
      name: 'Test Store',
      slug: 'test-store-1',
      status: 'pending_tour',
    };
    mockInsertChain([newStore]);

    const result = await createStore('org-uuid', {
      name: 'Test Store',
      address: { city: 'Delhi', country: 'IN' },
    } as any);

    expect(result.slug).toBe('test-store-1');
  });
});

// ---------------------------------------------------------------------------
// deactivateStore
// ---------------------------------------------------------------------------
describe('deactivateStore()', () => {
  it('✅ returns deactivated store on success', async () => {
    mockUpdateChain([{ id: 'store-uuid', status: 'inactive' }]);

    const result = await deactivateStore('org-uuid', 'store-uuid');

    expect(result).toMatchObject({ id: 'store-uuid', status: 'inactive' });
  });

  it('❌ returns null when store not found', async () => {
    mockUpdateChain([]);

    const result = await deactivateStore('org-uuid', 'non-existent');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getStoreById
// ---------------------------------------------------------------------------
describe('getStoreById()', () => {
  const accessMapOrg = {
    orgId: 'org-uuid',
    userId: 'user-uuid',
    roleTemplate: 'org_manager',
    scopeType: 'org' as const,
    dataScope: { storeIds: [], zoneIds: [] },
    permissions: [],
    modules: [],
    orgStatus: 'active',
    orgRejectedAt: null,
    orgRejectionReason: null,
    permissionsVersion: 1,
  };

  it('✅ returns store when found', async () => {
    const fakeStore = {
      id: 'store-uuid',
      orgId: 'org-uuid',
      name: 'Test Store',
      status: 'active',
    };
    mockSelectChain([fakeStore]);

    const result = await getStoreById('org-uuid', 'store-uuid', accessMapOrg);

    expect(result).toMatchObject({ id: 'store-uuid', name: 'Test Store' });
  });

  it('✅ returns null when store not found', async () => {
    mockSelectChain([]);

    const result = await getStoreById('org-uuid', 'non-existent', accessMapOrg);

    expect(result).toBeNull();
  });
});
