// Valid permission strings (code-level registry)
// Adding new permissions here requires NO schema migration — just add and seed
export const PERMISSIONS = [
  'dashboard:read',
  'stores:read',
  'stores:write',
  'stores:delete',
  'stores:download',
  'stores:import',
  'surveys:read',
  'surveys:write',
  'surveys:delete',
  'surveys:download',
  'surveys:execute',
  'employees:read',
  'employees:write',
  'employees:delete',
  'employees:manage',
  'schedule:read',
  'schedule:write',
  'schedule:delete',
  'settings:read',
  'settings:write',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Extract unique resources from permissions
export const RESOURCES = [...new Set(PERMISSIONS.map((p) => p.split(':')[0]))] as const;

export type Resource = (typeof RESOURCES)[number];
