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
  organizations: {},
  users: {},
  roleTemplates: {},
  roleTemplatePermissions: {},
  userPermissions: {},
  superAdmins: {},
}));

import { db } from '../../../shared/db';
import {
  registerOrg,
  getOrgSettings,
  updateOrgSettings,
  listActiveSuperAdmins,
  findSuperAdmin,
} from '../org.service';

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
// registerOrg
// ---------------------------------------------------------------------------
describe('registerOrg()', () => {
  const validInput = {
    orgName: 'ACME Corp',
    orgType: 'chain' as const,
    industryId: 'industry-uuid',
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  };

  it('✅ creates org and user when org_manager template exists', async () => {
    // uniqueSlug check — no existing slug
    mockSelectChain([]);
    // Get org_manager template
    mockSelectChain([{ id: 'template-uuid', name: 'org_manager' }]);
    // Get template permissions
    mockSelectChain([{ permission: 'employees:read' }, { permission: 'stores:read' }]);
    // Insert org
    mockInsertChain([
      {
        id: 'org-uuid',
        name: 'ACME Corp',
        slug: 'acme-corp',
        status: 'pending_approval',
        contactEmail: 'admin@acme.com',
        createdAt: new Date(),
      },
    ]);
    // Insert user
    mockInsertChain([
      {
        id: 'user-uuid',
        email: 'admin@acme.com',
        roleTemplate: 'org_manager',
        scopeType: 'org',
        status: 'active',
      },
    ]);
    // Insert user permissions
    mockInsertChain([]);

    const result = await registerOrg(validInput, 'sso-user-123', 'admin@acme.com');

    expect(result.org.name).toBe('ACME Corp');
    expect(result.user.roleTemplate).toBe('org_manager');
  });

  it('❌ throws when org_manager role template not found in DB', async () => {
    // uniqueSlug check — no existing slug
    mockSelectChain([]);
    // Get org_manager template — returns empty
    mockSelectChain([]);

    await expect(registerOrg(validInput, 'sso-user-123', 'admin@acme.com')).rejects.toThrow(
      'System role template "org_manager" not found',
    );
  });
});

// ---------------------------------------------------------------------------
// getOrgSettings
// ---------------------------------------------------------------------------
describe('getOrgSettings()', () => {
  it('✅ returns org data when found', async () => {
    mockSelectChain([{ id: 'org-uuid', name: 'ACME', status: 'active' }]);

    const result = await getOrgSettings('org-uuid');

    expect(result).toMatchObject({ id: 'org-uuid', name: 'ACME' });
  });

  it('✅ returns null when org not found', async () => {
    mockSelectChain([]);

    const result = await getOrgSettings('non-existent-uuid');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateOrgSettings
// ---------------------------------------------------------------------------
describe('updateOrgSettings()', () => {
  it('✅ returns updated org on success', async () => {
    const updatedOrg = {
      id: 'org-uuid',
      name: 'ACME Updated',
      website: 'https://acme.com',
      updatedAt: new Date(),
    };
    mockUpdateChain([updatedOrg]);

    const result = await updateOrgSettings('org-uuid', { name: 'ACME Updated', website: 'https://acme.com' });

    expect(result).toMatchObject({ id: 'org-uuid', name: 'ACME Updated' });
  });

  it('✅ returns null when org not found', async () => {
    mockUpdateChain([]);

    const result = await updateOrgSettings('missing-uuid', { name: 'Nope' });

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listActiveSuperAdmins
// ---------------------------------------------------------------------------
describe('listActiveSuperAdmins()', () => {
  it('✅ returns array of active super admins', async () => {
    const admins = [
      { id: 'sadmin-1', email: 'sa@shelfex.com', name: 'Super Admin', ssoUserId: 'sso-1' },
    ];
    mockSelectChain(admins);

    const result = await listActiveSuperAdmins();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect((result as any[])[0].email).toBe('sa@shelfex.com');
  });

  it('✅ returns empty array when no super admins', async () => {
    mockSelectChain([]);

    const result = await listActiveSuperAdmins();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findSuperAdmin
// ---------------------------------------------------------------------------
describe('findSuperAdmin()', () => {
  it('✅ returns super admin when found', async () => {
    const admin = { id: 'sadmin-1', ssoUserId: 'sso-123', status: 'active' };
    mockSelectChain([admin]);

    const result = await findSuperAdmin('sso-123');

    expect(result).toMatchObject({ id: 'sadmin-1' });
  });

  it('✅ returns null when super admin not found', async () => {
    mockSelectChain([]);

    const result = await findSuperAdmin('unknown-sso');

    expect(result).toBeNull();
  });
});
