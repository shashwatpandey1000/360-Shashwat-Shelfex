'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { employeesApi } from '@/lib/api/employees.api';
import { storesApi } from '@/lib/api/stores.api';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/common/button';
import StatusBadge from '@/components/common/StatusBadge';
import PageLoader from '@/components/common/PageLoader';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  Trash2,
  X,
  Plus,
  Pencil,
  Store,
  ShieldCheck,
  User,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  org_manager: 'Organization Manager',
  zone_manager: 'Zone Manager',
  store_manager: 'Store Manager',
  surveyor: 'Surveyor',
  custom: 'Custom',
};

const ROLE_OPTIONS = [
  { value: 'org_manager', label: 'Organization Manager' },
  { value: 'zone_manager', label: 'Zone Manager' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'surveyor', label: 'Surveyor' },
];

const SCOPE_OPTIONS = [
  { value: 'org', label: 'Entire Organization' },
  { value: 'zones', label: 'Specific Zones' },
  { value: 'stores', label: 'Specific Stores' },
];

const sidebarSectionTitleClass =
  'text-[11px] font-semibold uppercase leading-4 tracking-wide text-gray-500 dark:text-gray-400';

const sidebarEditButtonClass =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-neutral-800 dark:hover:text-gray-100';

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid min-h-9 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 border-b border-gray-100 py-2 last:border-b-0 dark:border-gray-800/80">
      <span className="text-[13px] leading-5 text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={cn(
          'min-w-0 truncate text-right text-[13px] leading-5 text-gray-900 dark:text-gray-100',
          mono && 'font-mono text-gray-600 dark:text-gray-300',
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function SidebarSelect({
  label,
  value,
  onValueChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="relative w-full">
      <span className="text-brand mb-2 block text-[14px] leading-5 font-medium">{label}</span>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (typeof nextValue === 'string') onValueChange(nextValue);
        }}
        items={options}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={label}
          className="bg-surface hover:border-brand dark:bg-surface-muted h-9 w-full rounded-md border-gray-300 px-3 text-[13px] text-gray-900 focus-visible:ring-0 dark:border-gray-800 dark:text-gray-100"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-md">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="rounded-md py-2 pr-8 pl-2.5 text-[13px]"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface EmployeeDetail {
  id: string;
  ssoUserId: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  roleTemplate: string;
  scopeType: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  scopeEntityIds: string[];
}

const PERMISSION_GROUPS = [
  {
    resource: 'dashboard',
    label: 'Dashboard',
    description: 'Access to the main analytics and overview dashboard.',
    actions: [
      {
        perm: 'dashboard:read',
        label: 'View Dashboard',
        description: "See key metrics, today's survey status, activity feed and alerts.",
      },
    ],
  },
  {
    resource: 'stores',
    label: 'Stores',
    description: 'Manage retail stores and their configurations.',
    actions: [
      {
        perm: 'stores:read',
        label: 'View Stores',
        description: 'Browse the store list and open store detail pages.',
      },
      {
        perm: 'stores:write',
        label: 'Create & Edit Stores',
        description: 'Add new stores and update store details, timezone, and manager.',
      },
      {
        perm: 'stores:delete',
        label: 'Deactivate Stores',
        description: 'Mark stores as inactive (soft delete).',
      },
      {
        perm: 'stores:download',
        label: 'Download Store Data',
        description: 'Export store information and reports.',
      },
      {
        perm: 'stores:import',
        label: 'Bulk Import via CSV',
        description: 'Upload a CSV to create multiple stores at once.',
      },
    ],
  },
  {
    resource: 'surveys',
    label: 'Surveys',
    description: 'Access and manage 360° survey captures and results.',
    actions: [
      {
        perm: 'surveys:read',
        label: 'View Surveys',
        description: 'Browse survey history, photos, and AI-detected product results.',
      },
      {
        perm: 'surveys:write',
        label: 'Create & Edit Surveys',
        description: 'Create and modify survey records and configurations.',
      },
      {
        perm: 'surveys:delete',
        label: 'Delete Surveys',
        description: 'Permanently remove survey records.',
      },
      {
        perm: 'surveys:download',
        label: 'Download Surveys',
        description: 'Export survey photos and reports.',
      },
      {
        perm: 'surveys:execute',
        label: 'Execute Surveys',
        description: 'Perform surveys via the mobile capture app.',
      },
    ],
  },
  {
    resource: 'employees',
    label: 'Employees',
    description: 'Manage users, roles, and store assignments within the org.',
    actions: [
      {
        perm: 'employees:read',
        label: 'View Employees',
        description: 'Browse the employee list and view profile pages.',
      },
      {
        perm: 'employees:write',
        label: 'Invite & Edit Employees',
        description: 'Invite new users and update their role, scope, and permissions.',
      },
      {
        perm: 'employees:delete',
        label: 'Deactivate Employees',
        description: 'Deactivate user accounts from the platform.',
      },
      {
        perm: 'employees:manage',
        label: 'Manage Assignments',
        description: 'Assign and reassign surveyors to scheduled survey slots.',
      },
    ],
  },
  {
    resource: 'schedule',
    label: 'Schedule',
    description: 'Control the recurring survey schedule across stores.',
    actions: [
      {
        perm: 'schedule:read',
        label: 'View Schedule',
        description: 'See time windows, recurrence rules, and materialized survey slots.',
      },
      {
        perm: 'schedule:write',
        label: 'Create & Edit Schedule',
        description: 'Set org-wide default schedule and per-store overrides.',
      },
      {
        perm: 'schedule:delete',
        label: 'Delete Schedule',
        description: 'Remove schedule templates and time windows.',
      },
    ],
  },
  {
    resource: 'settings',
    label: 'Settings',
    description: 'Organization-level configuration and preferences.',
    actions: [
      {
        perm: 'settings:read',
        label: 'View Settings',
        description: 'See org profile, regional settings, and notification preferences.',
      },
      {
        perm: 'settings:write',
        label: 'Edit Settings',
        description: 'Update org name, timezone, currency, and all org-level configuration.',
      },
    ],
  },
];

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('employees:write');
  const canDelete = hasPermission('employees:delete');

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingAccess, setEditingAccess] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editScope, setEditScope] = useState('');
  const [editStoreIds, setEditStoreIds] = useState<string[]>([]);
  const [editStoreNames, setEditStoreNames] = useState<Record<string, string>>({});
  const [savingAccess, setSavingAccess] = useState(false);

  const [storeSearch, setStoreSearch] = useState('');
  const [storeResults, setStoreResults] = useState<{ id: string; name: string }[]>([]);
  const [showStoreSearch, setShowStoreSearch] = useState(false);
  const [scopeStoreNames, setScopeStoreNames] = useState<Record<string, string>>({});

  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editGroupPerms, setEditGroupPerms] = useState<string[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);

  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateConfirmText, setDeactivateConfirmText] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeesApi.getById(id as string);
      const data = res.data;
      setEmployee(data);
      setEditRole(data.roleTemplate);
      setEditScope(data.scopeType);
      setEditStoreIds(data.scopeEntityIds);
      if (data.scopeType === 'stores' && data.scopeEntityIds.length > 0) {
        const names: Record<string, string> = {};
        for (const sid of data.scopeEntityIds) {
          try {
            const r = await storesApi.getById(sid);
            names[sid] = r.data.name;
          } catch {
            names[sid] = sid;
          }
        }
        setScopeStoreNames(names);
        setEditStoreNames(names);
      }
    } catch {
      toast.error('Employee not found');
      router.push('/dashboard/employees');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (!showStoreSearch || storeSearch.length < 2) {
      setStoreResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await storesApi.list({ perPage: 15, search: storeSearch });
        setStoreResults(r.data.data.map((s: any) => ({ id: s.id, name: s.name })));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [storeSearch, showStoreSearch]);

  const handleSaveAccess = async () => {
    if (!employee) return;
    setSavingAccess(true);
    try {
      await employeesApi.update(employee.id, {
        roleTemplate: editRole as any,
        scopeType: editScope as any,
        scopeEntityIds: editScope !== 'org' ? editStoreIds : [],
      });
      toast.success('Access updated');
      setEditingAccess(false);
      fetchEmployee();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleSaveGroupPerms = async () => {
    if (!employee || !editingGroup) return;
    setSavingGroup(true);
    try {
      const group = PERMISSION_GROUPS.find((g) => g.resource === editingGroup);
      if (!group) return;
      const groupPerms = group.actions.map((a) => a.perm);
      const otherPerms = employee.permissions.filter((p) => !groupPerms.includes(p));
      await employeesApi.update(employee.id, { permissions: [...otherPerms, ...editGroupPerms] });
      toast.success('Permissions saved');
      setEditingGroup(null);
      fetchEmployee();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeactivate = async () => {
    if (!employee) return;
    setDeactivating(true);
    try {
      await employeesApi.deactivate(employee.id);
      toast.success('Employee deactivated');
      setShowDeactivateDialog(false);
      setDeactivateConfirmText('');
      fetchEmployee();
    } catch {
      toast.error('Failed to deactivate');
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    if (!employee) return;
    setReactivating(true);
    try {
      await employeesApi.reactivate(employee.id);
      toast.success('Employee reactivated');
      fetchEmployee();
    } catch {
      toast.error('Failed to reactivate');
    } finally {
      setReactivating(false);
    }
  };

  const addStore = (storeId: string, storeName: string) => {
    if (!editStoreIds.includes(storeId)) {
      setEditStoreIds((prev) => [...prev, storeId]);
      setEditStoreNames((prev) => ({ ...prev, [storeId]: storeName }));
    }
    setStoreSearch('');
    setStoreResults([]);
    setShowStoreSearch(false);
  };

  if (loading) return <PageLoader />;
  if (!employee) return null;

  const activeScopeType = editingAccess ? editScope : employee.scopeType;
  const activeStoreIds = editingAccess ? editStoreIds : employee.scopeEntityIds;
  const activeScopeLabel =
    activeScopeType === 'org'
      ? 'Entire org'
      : activeScopeType === 'zones'
        ? 'Specific zones'
        : 'Specific stores';

  return (
    <section className="bg-surface text-brand flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-surface flex h-max w-full shrink-0 items-center justify-between border-b px-8 py-4">
        <div className="flex flex-col gap-1.5">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold uppercase">{employee.name || employee.email}</h1>
            <StatusBadge status={employee.status} />
            <span className="inline-flex items-center bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
              {ROLE_LABELS[employee.roleTemplate] || employee.roleTemplate}
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-neutral-800 dark:text-gray-400">
              <ShieldCheck size={12} />
              {employee.permissions.length} permissions
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {canDelete && employee.status === 'inactive' && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md border border-gray-300 text-xs text-green-700 hover:border-green-500 hover:bg-green-50 dark:border-gray-700 dark:text-green-400 dark:hover:border-green-800 dark:hover:bg-green-950/30"
              onClick={handleReactivate}
              disabled={reactivating}
            >
              {reactivating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              Reactivate
            </Button>
          )}
          {canDelete && employee.status !== 'inactive' && (
            <Button
              variant="destructive"
              size="sm"
              className="rounded-md text-xs"
              onClick={() => setShowDeactivateDialog(true)}
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT — permission groups */}
        <div className="flex-1 overflow-y-auto border-r px-8 py-6">
          <h2>Permissions</h2>
          <p className="mb-2.5 text-[12px] text-gray-400 dark:text-gray-500">
            Each section controls what this user can do. Editing one section preserves all other
            permissions.
          </p>
          <div className="space-y-4">
            {PERMISSION_GROUPS.map((group) => {
              const groupPerms = group.actions.map((a) => a.perm);
              const activeCount = groupPerms.filter((p) => employee.permissions.includes(p)).length;
              const isEditing = editingGroup === group.resource;

              return (
                <div
                  key={group.resource}
                  className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-neutral-900"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {group.label}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 font-mono text-[10px]',
                            activeCount > 0
                              ? 'bg-brand-purple-soft text-brand-purple dark:bg-brand-purple/20 dark:text-brand-purple'
                              : 'bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-gray-500',
                          )}
                        >
                          {activeCount}/{group.actions.length}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                        {group.description}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          if (isEditing) {
                            setEditingGroup(null);
                          } else {
                            setEditingGroup(group.resource);
                            setEditGroupPerms(
                              employee.permissions.filter((p) => groupPerms.includes(p)),
                            );
                          }
                        }}
                        className={cn(
                          'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border p-0 transition-colors',
                          isEditing
                            ? 'border-brand-purple bg-brand-purple hover:bg-brand-purple text-white'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-neutral-800',
                        )}
                        title={isEditing ? 'Cancel' : 'Edit permissions'}
                      >
                        <Pencil size={13} />
                      </Button>
                    )}
                  </div>

                  {/* Permission rows */}
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {group.actions.map((action) => {
                      const hasIt = isEditing
                        ? editGroupPerms.includes(action.perm)
                        : employee.permissions.includes(action.perm);

                      return (
                        <div
                          key={action.perm}
                          className={cn(
                            'flex items-center justify-between px-5 py-3.5 transition-opacity',
                            !isEditing && !hasIt && 'opacity-40',
                          )}
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <p
                              className={cn(
                                'text-sm leading-snug',
                                hasIt
                                  ? 'text-gray-800 dark:text-gray-100'
                                  : 'text-gray-500 dark:text-gray-400',
                              )}
                            >
                              {action.label}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-gray-400 dark:text-gray-600">
                              {action.description}
                            </p>
                          </div>
                          {isEditing ? (
                            <Switch
                              checked={editGroupPerms.includes(action.perm)}
                              onCheckedChange={(checked) =>
                                setEditGroupPerms((prev) =>
                                  checked
                                    ? [...prev, action.perm]
                                    : prev.filter((p) => p !== action.perm),
                                )
                              }
                            />
                          ) : (
                            <div
                              className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                hasIt ? 'bg-brand-purple' : 'bg-gray-200 dark:bg-neutral-700',
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Edit footer */}
                  {isEditing && (
                    <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-neutral-800/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-md border border-gray-200 px-3 text-xs dark:border-gray-700"
                        onClick={() => setEditingGroup(null)}
                      >
                        Cancel
                      </Button>
                      <CustomButton size="sm" onClick={handleSaveGroupPerms} disabled={savingGroup}>
                        {savingGroup ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                        {savingGroup ? 'Saving…' : 'Save'}
                      </CustomButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — profile sidebar */}
        <aside className="bg-surface-muted/40 flex w-[25rem] shrink-0 flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-800 dark:bg-neutral-950/60">
          {/* Profile */}
          <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-gray-200 bg-white dark:border-gray-700 dark:bg-neutral-900">
                <User size={17} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-[15px] leading-5 font-semibold text-gray-900 dark:text-gray-100">
                  {employee.name || 'Unnamed employee'}
                </p>
                <p className="mt-0.5 truncate text-[13px] leading-5 text-gray-500 dark:text-gray-400">
                  {employee.email}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <DetailRow label="Phone" value={employee.phone || '—'} />
              <DetailRow label="SSO" value={employee.ssoUserId ? 'Linked' : 'Pending'} />
              <DetailRow
                label="Last login"
                value={
                  employee.lastLoginAt
                    ? new Date(employee.lastLoginAt).toLocaleDateString()
                    : 'Never'
                }
              />
              <DetailRow label="Joined" value={new Date(employee.createdAt).toLocaleDateString()} />
              <DetailRow label="ID" value={employee.id.slice(0, 8) + '…'} mono />
            </div>
          </div>

          {/* Role & Scope */}
          <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
            <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
              <span className={sidebarSectionTitleClass}>Role & Access</span>
              {canEdit && !editingAccess && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingAccess(true)}
                  className={sidebarEditButtonClass}
                >
                  <Pencil size={13} />
                </Button>
              )}
            </div>
            {!editingAccess ? (
              <div>
                <DetailRow
                  label="Role"
                  value={ROLE_LABELS[employee.roleTemplate] || employee.roleTemplate}
                />
                <DetailRow label="Scope" value={activeScopeLabel} />
              </div>
            ) : (
              <div className="space-y-4">
                <SidebarSelect
                  label="Role"
                  value={editRole}
                  onValueChange={(nextRole) => {
                    setEditRole(nextRole);
                    if (nextRole === 'org_manager') setEditScope('org');
                    else if (nextRole === 'zone_manager') setEditScope('zones');
                    else setEditScope('stores');
                  }}
                  options={ROLE_OPTIONS}
                />
                <SidebarSelect
                  label="Data Scope"
                  value={editScope}
                  onValueChange={(nextScope) => {
                    setEditScope(nextScope);
                    if (nextScope === 'org') setEditStoreIds([]);
                  }}
                  options={SCOPE_OPTIONS}
                  disabled={editRole === 'org_manager'}
                />
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 rounded-md border border-gray-200 px-3 text-[13px] dark:border-gray-700"
                    onClick={() => {
                      setEditingAccess(false);
                      setEditRole(employee.roleTemplate);
                      setEditScope(employee.scopeType);
                      setEditStoreIds(employee.scopeEntityIds);
                      setEditStoreNames(scopeStoreNames);
                      setStoreSearch('');
                      setStoreResults([]);
                      setShowStoreSearch(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <CustomButton
                    size="sm"
                    onClick={handleSaveAccess}
                    disabled={savingAccess}
                    className="h-9 flex-1 px-3 text-[13px]"
                  >
                    {savingAccess ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Save
                  </CustomButton>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Stores */}
          <div className="flex-1 px-5 py-5">
            <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
              <span className={sidebarSectionTitleClass}>
                {activeScopeType === 'stores' ? `Stores (${activeStoreIds.length})` : 'Scope'}
              </span>
              {canEdit && activeScopeType === 'stores' && !editingAccess && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingAccess(true)}
                  className={sidebarEditButtonClass}
                >
                  <Pencil size={13} />
                </Button>
              )}
            </div>
            {activeScopeType === 'org' ? (
              <div className="border border-gray-200 bg-white px-3 py-3 text-[13px] leading-5 text-gray-600 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-300">
                Full organization — sees all stores.
              </div>
            ) : activeScopeType === 'zones' ? (
              <div className="border border-gray-200 bg-white px-3 py-3 text-[13px] leading-5 text-gray-600 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-300">
                Scoped to assigned zones.
              </div>
            ) : editingAccess ? (
              <div>
                {editStoreIds.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {editStoreIds.map((sid) => (
                      <div
                        key={sid}
                        className="flex min-h-10 items-center justify-between border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-neutral-900"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="bg-brand-purple-soft dark:bg-brand-purple/20 flex h-7 w-7 shrink-0 items-center justify-center">
                            <Store size={13} className="text-brand-purple" />
                          </span>
                          <span className="truncate text-[13px] leading-5 text-gray-800 dark:text-gray-200">
                            {editStoreNames[sid] || sid}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditStoreIds((prev) => prev.filter((x) => x !== sid))}
                          className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:text-gray-500 dark:hover:bg-neutral-800"
                        >
                          <X size={13} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {!showStoreSearch ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowStoreSearch(true)}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-[13px] font-normal text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-neutral-800"
                  >
                    <Plus size={13} /> Add store
                  </Button>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        placeholder="Search stores…"
                        autoFocus
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-100 dark:placeholder:text-gray-600"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowStoreSearch(false);
                          setStoreSearch('');
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-gray-400 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                      >
                        <X size={13} />
                      </Button>
                    </div>
                    {storeResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 bg-white dark:border-gray-700 dark:bg-neutral-900">
                        {storeResults
                          .filter((s) => !editStoreIds.includes(s.id))
                          .map((store) => (
                            <Button
                              key={store.id}
                              type="button"
                              variant="ghost"
                              onClick={() => addStore(store.id, store.name)}
                              className="flex min-h-9 w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-[13px] font-normal text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-neutral-800"
                            >
                              <Plus size={12} className="text-gray-400" />
                              {store.name}
                            </Button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : activeStoreIds.length === 0 ? (
              <div className="border border-gray-200 bg-white px-3 py-3 text-[13px] leading-5 text-gray-500 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-400">
                No stores assigned.
              </div>
            ) : (
              <div className="space-y-2">
                {activeStoreIds.map((sid) => (
                  <Button
                    key={sid}
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(`/dashboard/stores/${sid}`)}
                    className="group flex min-h-10 w-full items-center justify-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-neutral-900 dark:hover:border-gray-700 dark:hover:bg-neutral-800"
                  >
                    <span className="bg-brand-purple-soft dark:bg-brand-purple/20 flex h-7 w-7 shrink-0 items-center justify-center">
                      <Store size={13} className="text-brand-purple" />
                    </span>
                    <span className="cursor-pointer truncate text-[13px] leading-5 text-gray-800 group-hover:underline dark:text-gray-200">
                      {scopeStoreNames[sid] || sid}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
