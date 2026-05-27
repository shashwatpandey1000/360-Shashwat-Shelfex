import { vi, describe, it, expect, beforeEach } from 'vitest';
import { makeChain } from '../../../__tests__/helpers/db.mock';

// ── DB mock ─────────────────────────────────────────────────────────────────
// vi.mock() is hoisted by Vitest before any const declarations, so the mock
// object MUST be defined inside the factory — not as a top-level variable.
vi.mock('../../../shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../shared/db/schema', () => ({
  users: {},
  userPermissions: {},
  userDataScopes: {},
  roleTemplates: {},
  roleTemplatePermissions: {},
  stores: {},
}));

vi.mock('../../../shared/services/email.service', () => ({
  sendEmployeeInviteEmail: vi.fn(),
}));

vi.mock('../../../shared/utils/permissions', () => ({
  PERMISSIONS: ['employees:read', 'employees:write', 'stores:read', 'stores:write'],
}));

// Import db AFTER mocks — Vitest ensures the mocked version is returned.
import { db } from '../../../shared/db';
import {
  createEmployee,
  deactivateEmployee,
  reactivateEmployee,
  updateEmployee,
  assignStoreManager,
} from '../employee.service';

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
// createEmployee
// ---------------------------------------------------------------------------
describe('createEmployee()', () => {
  const baseInput = {
    email: 'surveyor@acme.com',
    name: 'Alice',
    roleTemplate: 'surveyor' as const,
    scopeType: 'stores' as const,
    scopeEntityIds: [],
  };

  it('✅ creates an employee successfully (org_manager creating surveyor)', async () => {
    // Check duplicate email
    mockSelectChain([]);
    // Get role template
    mockSelectChain([{ id: 'template-uuid', name: 'surveyor', displayName: 'Surveyor' }]);
    // Get template permissions
    mockSelectChain([{ permission: 'surveys:execute' }]);
    // Insert user
    mockInsertChain([
      {
        id: 'emp-uuid',
        email: 'surveyor@acme.com',
        name: 'Alice',
        roleTemplate: 'surveyor',
        status: 'pending_first_login',
      },
    ]);
    // Insert user permissions
    mockInsertChain([]);

    const result = await createEmployee('org-uuid', baseInput, 'creator-uuid', 'org_manager', 'ACME');

    expect(result).toMatchObject({
      id: 'emp-uuid',
      roleTemplate: 'surveyor',
      status: 'pending_first_login',
    });
  });

  it('❌ throws privilege escalation error (surveyor cannot create org_manager)', async () => {
    const escalationInput = { ...baseInput, roleTemplate: 'org_manager' as const, scopeType: 'org' as const };

    await expect(
      createEmployee('org-uuid', escalationInput, 'creator-uuid', 'surveyor', 'ACME'),
    ).rejects.toThrow('A surveyor cannot create a user with role org_manager');
  });

  it('❌ throws when store_manager tries to grant org-level scope', async () => {
    const orgScopeInput = {
      ...baseInput,
      roleTemplate: 'surveyor' as const,
      scopeType: 'org' as const,
    };

    await expect(
      createEmployee('org-uuid', orgScopeInput, 'creator-uuid', 'store_manager', 'ACME'),
    ).rejects.toThrow('Store managers can only invite users with store-level scope');
  });

  it('❌ throws when zone_manager tries to grant org-level scope', async () => {
    const orgScopeInput = {
      ...baseInput,
      roleTemplate: 'surveyor' as const,
      scopeType: 'org' as const,
    };

    await expect(
      createEmployee('org-uuid', orgScopeInput, 'creator-uuid', 'zone_manager', 'ACME'),
    ).rejects.toThrow('Zone managers cannot grant organization-wide access');
  });

  it('❌ throws duplicate email error when email already exists in org', async () => {
    // Check duplicate email — returns existing user
    mockSelectChain([{ id: 'existing-emp' }]);

    await expect(
      createEmployee('org-uuid', baseInput, 'creator-uuid', 'org_manager', 'ACME'),
    ).rejects.toThrow('A user with this email already exists');
  });
});

// ---------------------------------------------------------------------------
// deactivateEmployee
// ---------------------------------------------------------------------------
describe('deactivateEmployee()', () => {
  it('✅ returns deactivated user on success', async () => {
    const deactivatedUser = { id: 'emp-uuid', status: 'inactive' };
    mockUpdateChain([deactivatedUser]);
    // Update stores (clear manager)
    mockUpdateChain([]);

    const result = await deactivateEmployee('org-uuid', 'emp-uuid');

    expect(result).toMatchObject({ status: 'inactive' });
  });

  it('❌ returns null when employee not found', async () => {
    mockUpdateChain([]);

    const result = await deactivateEmployee('org-uuid', 'non-existent');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// reactivateEmployee
// ---------------------------------------------------------------------------
describe('reactivateEmployee()', () => {
  it('✅ returns active user on success', async () => {
    mockUpdateChain([{ id: 'emp-uuid', status: 'active' }]);

    const result = await reactivateEmployee('org-uuid', 'emp-uuid');

    expect(result).toMatchObject({ status: 'active' });
  });

  it('❌ returns null when employee not found', async () => {
    mockUpdateChain([]);

    const result = await reactivateEmployee('org-uuid', 'non-existent');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateEmployee
// ---------------------------------------------------------------------------
describe('updateEmployee()', () => {
  it('✅ updates name when employee exists', async () => {
    mockSelectChain([{ id: 'emp-uuid', orgId: 'org-uuid', roleTemplate: 'surveyor', status: 'active' }]);
    mockUpdateChain([{ id: 'emp-uuid', name: 'Alice Updated' }]);

    const result = await updateEmployee('org-uuid', 'emp-uuid', { name: 'Alice Updated' });

    expect(result).toMatchObject({ name: 'Alice Updated' });
  });

  it('❌ returns null when employee not found', async () => {
    mockSelectChain([]);

    const result = await updateEmployee('org-uuid', 'non-existent', { name: 'Nobody' });

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// assignStoreManager
// ---------------------------------------------------------------------------
describe('assignStoreManager()', () => {
  it('❌ throws Employee not found when employee does not exist', async () => {
    mockSelectChain([]);

    await expect(
      assignStoreManager('org-uuid', 'store-uuid', 'non-existent-emp'),
    ).rejects.toThrow('Employee not found');
  });

  it('❌ throws Employee is inactive when employee status is inactive', async () => {
    mockSelectChain([{ id: 'emp-uuid', roleTemplate: 'store_manager', status: 'inactive' }]);

    await expect(
      assignStoreManager('org-uuid', 'store-uuid', 'emp-uuid'),
    ).rejects.toThrow('Employee is inactive');
  });

  it('❌ throws Store not found when store does not exist', async () => {
    mockSelectChain([{ id: 'emp-uuid', roleTemplate: 'store_manager', status: 'active' }]);
    mockSelectChain([]);

    await expect(
      assignStoreManager('org-uuid', 'non-existent-store', 'emp-uuid'),
    ).rejects.toThrow('Store not found');
  });

  it('✅ assigns store manager when both employee and store exist', async () => {
    mockSelectChain([{ id: 'emp-uuid', roleTemplate: 'store_manager', status: 'active' }]);
    mockSelectChain([{ id: 'store-uuid' }]);
    mockUpdateChain([{ id: 'store-uuid', managerId: 'emp-uuid' }]);

    const result = await assignStoreManager('org-uuid', 'store-uuid', 'emp-uuid');

    expect(result).toMatchObject({ id: 'store-uuid', managerId: 'emp-uuid' });
  });
});
