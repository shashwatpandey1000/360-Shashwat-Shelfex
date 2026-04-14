'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { employeesApi } from '@/lib/api/employees.api';
import { storesApi } from '@/lib/api/stores.api';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import StatusBadge from '@/components/common/StatusBadge';
import SectionCard from '@/components/common/SectionCard';
import InfoRow from '@/components/common/InfoRow';
import PageLoader from '@/components/common/PageLoader';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, Trash2, X, Plus } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  org_manager: 'Organization Manager',
  zone_manager: 'Zone Manager',
  store_manager: 'Store Manager',
  surveyor: 'Surveyor',
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

const TABS = ['Overview', 'Access & Stores', 'Permissions'] as const;

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('employees:write');
  const canDelete = hasPermission('employees:delete');

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editScope, setEditScope] = useState('');
  const [editStoreIds, setEditStoreIds] = useState<string[]>([]);
  const [editStoreNames, setEditStoreNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Store search for adding stores
  const [storeSearch, setStoreSearch] = useState('');
  const [storeResults, setStoreResults] = useState<{ id: string; name: string }[]>([]);
  const [showStoreSearch, setShowStoreSearch] = useState(false);

  // Resolved store names for view mode
  const [scopeStoreNames, setScopeStoreNames] = useState<Record<string, string>>({});

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeesApi.getById(id as string);
      const data = res.data;
      setEmployee(data);
      setEditRole(data.roleTemplate);
      setEditScope(data.scopeType);
      setEditStoreIds(data.scopeEntityIds);

      // Resolve store names
      if (data.scopeType === 'stores' && data.scopeEntityIds.length > 0) {
        const names: Record<string, string> = {};
        for (const storeId of data.scopeEntityIds) {
          try {
            const storeRes = await storesApi.getById(storeId);
            names[storeId] = storeRes.data.name;
          } catch {
            names[storeId] = storeId;
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

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  // Debounced store search
  useEffect(() => {
    if (!showStoreSearch || storeSearch.length < 2) {
      setStoreResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await storesApi.list({ perPage: 15, search: storeSearch });
        setStoreResults(res.data.data.map((s: any) => ({ id: s.id, name: s.name })));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [storeSearch, showStoreSearch]);

  const handleSaveAccess = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      await employeesApi.update(employee.id, {
        roleTemplate: editRole as any,
        scopeType: editScope as any,
        scopeEntityIds: editScope !== 'org' ? editStoreIds : [],
      });
      toast.success('Access updated');
      setEditing(false);
      fetchEmployee();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!employee) return;
    try {
      await employeesApi.deactivate(employee.id);
      toast.success('Employee deactivated');
      fetchEmployee();
    } catch {
      toast.error('Failed to deactivate');
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

  const removeStore = (storeId: string) => {
    setEditStoreIds((prev) => prev.filter((id) => id !== storeId));
  };

  if (loading) return <PageLoader />;
  if (!employee) return null;

  return (
    <section className="flex-1 overflow-scroll">
      {/* Header */}
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none px-2"
            onClick={() => router.push('/dashboard/employees')}
          >
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-xl font-semibold uppercase">
            {employee.name || employee.email}
          </h1>
          <StatusBadge status={employee.status} />
          <span className="bg-gray-100 px-2 py-0.5 text-xs">
            {ROLE_LABELS[employee.roleTemplate] || employee.roleTemplate}
          </span>
        </div>
        <div className="flex gap-2">
          {canDelete && employee.status !== 'inactive' && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none border text-xs text-red-600 hover:bg-red-50 hover:underline"
              onClick={handleDeactivate}
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-[#131313] font-medium text-[#131313]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-8 py-6">
        {activeTab === 'Overview' && (
          <div className="max-w-lg space-y-6">
            <SectionCard title="Profile">
              <div className="space-y-3 text-sm">
                <InfoRow label="Name" value={employee.name || '—'} />
                <InfoRow label="Email" value={employee.email} />
                <InfoRow label="Phone" value={employee.phone || '—'} />
                <InfoRow label="Role" value={ROLE_LABELS[employee.roleTemplate] || employee.roleTemplate} />
                <InfoRow label="Status" value={employee.status.replace(/_/g, ' ')} />
                <InfoRow label="SSO Linked" value={employee.ssoUserId ? 'Yes' : 'Pending registration'} />
                <InfoRow label="Last Login" value={employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString() : 'Never'} />
              </div>
            </SectionCard>
            <SectionCard title="Info" variant="muted">
              <div className="space-y-2 text-sm text-gray-500">
                <InfoRow label="ID" value={employee.id} mono />
                <InfoRow label="Created" value={new Date(employee.createdAt).toLocaleDateString()} />
                <InfoRow label="Updated" value={new Date(employee.updatedAt).toLocaleDateString()} />
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'Access & Stores' && (
          <div className="max-w-lg space-y-6">
            {!editing ? (
              <>
                <SectionCard title="Role & Scope">
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Role" value={ROLE_LABELS[employee.roleTemplate] || employee.roleTemplate} />
                    <InfoRow label="Scope Type" value={employee.scopeType} />
                    {employee.scopeType === 'org' && (
                      <p className="text-gray-500">Full organization access — sees all stores</p>
                    )}
                  </div>
                </SectionCard>
                {employee.scopeType === 'stores' && (
                  <SectionCard title={`Assigned Stores (${employee.scopeEntityIds.length})`}>
                    {employee.scopeEntityIds.length === 0 ? (
                      <p className="text-sm text-gray-400">No stores assigned</p>
                    ) : (
                      <div className="space-y-1">
                        {employee.scopeEntityIds.map((sid) => (
                          <div
                            key={sid}
                            onClick={() => router.push(`/dashboard/stores/${sid}`)}
                            className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-100"
                          >
                            <span className="h-1.5 w-1.5 bg-[#131313]" />
                            <span className="hover:underline">{scopeStoreNames[sid] || sid}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    className="rounded-none text-xs hover:underline"
                    onClick={() => setEditing(true)}
                  >
                    Edit Access & Stores
                  </Button>
                )}
              </>
            ) : (
              <>
                <SectionCard title="Edit Role & Scope">
                  <div className="space-y-4">
                    <CustomInput.Select
                      label="Role"
                      value={editRole}
                      onChange={(e) => {
                        setEditRole(e.target.value);
                        if (e.target.value === 'org_manager') setEditScope('org');
                        else if (e.target.value === 'zone_manager') setEditScope('zones');
                        else setEditScope('stores');
                      }}
                      options={ROLE_OPTIONS}
                    />
                    <CustomInput.Select
                      label="Data Scope"
                      value={editScope}
                      onChange={(e) => {
                        setEditScope(e.target.value);
                        if (e.target.value === 'org') setEditStoreIds([]);
                      }}
                      options={SCOPE_OPTIONS}
                      disabled={editRole === 'org_manager'}
                    />
                  </div>
                </SectionCard>
                {editScope === 'stores' && (
                  <SectionCard title={`Assigned Stores (${editStoreIds.length})`}>
                    {editStoreIds.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {editStoreIds.map((sid) => (
                          <div key={sid} className="flex items-center justify-between px-2 py-1.5 text-sm odd:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 bg-[#131313]" />
                              {editStoreNames[sid] || sid}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStore(sid)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {!showStoreSearch ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-none border text-xs text-gray-700 hover:border-black hover:bg-gray-200"
                        onClick={() => setShowStoreSearch(true)}
                      >
                        <Plus size={14} />
                        Add Store
                      </Button>
                    ) : (
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={storeSearch}
                            onChange={(e) => setStoreSearch(e.target.value)}
                            placeholder="Search stores..."
                            className="flex w-full rounded-none border bg-white px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400 hover:border-black focus:border-black focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => { setShowStoreSearch(false); setStoreSearch(''); }}
                            className="text-gray-400 hover:text-black"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {storeResults.length > 0 && (
                          <div className="max-h-32 overflow-y-auto border bg-white">
                            {storeResults
                              .filter((s) => !editStoreIds.includes(s.id))
                              .map((store) => (
                                <button
                                  key={store.id}
                                  type="button"
                                  onClick={() => addStore(store.id, store.name)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                                >
                                  <Plus size={12} className="text-gray-400" />
                                  {store.name}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </SectionCard>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none text-xs"
                    onClick={() => {
                      setEditing(false);
                      setEditRole(employee.roleTemplate);
                      setEditScope(employee.scopeType);
                      setEditStoreIds(employee.scopeEntityIds);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-none text-xs hover:underline"
                    onClick={handleSaveAccess}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'Permissions' && (
          <div className="max-w-lg">
            <SectionCard title={`Permissions (${employee.permissions.length})`}>
              <div className="space-y-1">
                {employee.permissions.length === 0 ? (
                  <p className="text-sm text-gray-400">No permissions assigned</p>
                ) : (
                  employee.permissions.map((perm) => (
                    <div
                      key={perm}
                      className="px-2 py-1.5 font-mono text-sm text-gray-700 odd:bg-gray-50"
                    >
                      {perm}
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
            <p className="mt-3 text-xs text-gray-400">
              Permissions are set automatically from the role template. Changing the role on the Access & Stores tab will update permissions.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}