'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { storesApi } from '@/lib/api/stores.api';
import { lookupsApi } from '@/lib/api/lookups.api';
import { employeesApi } from '@/lib/api/employees.api';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import SectionCard from '@/components/common/SectionCard';
import InfoRow from '@/components/common/InfoRow';
import PageLoader from '@/components/common/PageLoader';
import ComingSoon from '@/components/common/ComingSoon';
import EditStoreDialog from '../components/EditStoreDialog';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/google-maps';
import { STORE_PIN_COLOR, STORE_PIN_PATH, storeMapStyles } from '@/lib/google-maps-styles';
import { cn } from '@/lib/utils';

interface StoreDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: any;
  location: any;
  timezone: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  categoryId: string | null;
  managerId: string | null;
  operatingHours: any;
  logoUrl: string | null;
  zoneId: string | null;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeRow {
  id: string;
  email: string;
  name: string | null;
  roleTemplate: string;
  scopeType: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  org_manager: 'Org Manager',
  zone_manager: 'Zone Manager',
  store_manager: 'Store Manager',
  surveyor: 'Surveyor',
};

const TABS = ['Overview', 'Surveys', 'Employees'] as const;

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('stores:write');
  const canDelete = hasPermission('stores:delete');

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Employees tab state
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empTotalPages, setEmpTotalPages] = useState(1);
  const [empPage, setEmpPage] = useState(1);
  const [empSearch, setEmpSearch] = useState('');
  const [empSearchInput, setEmpSearchInput] = useState('');
  const [empLoading, setEmpLoading] = useState(false);

  const { isLoaded: mapsLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const fetchStore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storesApi.getById(id as string);
      setStore(res.data);
    } catch {
      toast.error('Store not found');
      router.push('/dashboard/stores');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchEmployees = useCallback(async () => {
    if (!id) return;
    setEmpLoading(true);
    try {
      const res = await employeesApi.list({
        storeId: id as string,
        page: empPage,
        perPage: 25,
        search: empSearch || undefined,
        sortBy: 'roleTemplate',
        sortOrder: 'asc',
      });
      setEmployees(res.data.data);
      setEmpTotal(res.data.total);
      setEmpTotalPages(res.data.totalPages);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setEmpLoading(false);
    }
  }, [id, empPage, empSearch]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  useEffect(() => {
    lookupsApi.getStoreCategories().then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    if (activeTab === 'Employees') fetchEmployees();
  }, [activeTab, fetchEmployees]);

  // Debounce employee search
  useEffect(() => {
    const t = setTimeout(() => {
      setEmpSearch(empSearchInput);
      setEmpPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [empSearchInput]);

  const handleDeactivate = async () => {
    if (!store) return;
    try {
      await storesApi.deactivate(store.id);
      toast.success('Store deactivated');
      fetchStore();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  const handleDeactivateEmployee = async (emp: EmployeeRow) => {
    try {
      await employeesApi.deactivate(emp.id);
      toast.success(`${emp.name || emp.email} deactivated`);
      fetchEmployees();
    } catch {
      toast.error('Failed to deactivate employee');
    }
  };

  const empTableConfig: TableConfig<EmployeeRow> = {
    uniqueKey: 'id',
    columns: [
      {
        heading: 'Name',
        field: 'name',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => <span>{row.name || '—'}</span>,
      },
      { heading: 'Email', field: 'email', isSortable: false, visibleFrom: 'always' },
      {
        heading: 'Role',
        field: 'roleTemplate',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => (
          <span className="bg-gray-100 px-2 py-0.5 text-xs dark:bg-neutral-800 dark:text-gray-300">
            {ROLE_LABELS[row.roleTemplate] || row.roleTemplate}
          </span>
        ),
      },
      {
        heading: 'Status',
        field: 'status',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        heading: 'Last Login',
        field: 'lastLoginAt',
        isSortable: false,
        visibleFrom: 'xl',
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : 'Never'}
          </span>
        ),
      },
    ],
    isSelectable: false,
    rowActions: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="bg-surface h-6 w-6 rounded-none p-0 hover:bg-gray-200 dark:hover:bg-neutral-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none">
          <DropdownMenuItem
            className="rounded-none"
            onClick={() => router.push(`/dashboard/employees/${row.id}`)}
          >
            View Employee
          </DropdownMenuItem>
          {row.status !== 'inactive' && (
            <DropdownMenuItem
              className="rounded-none text-red-600"
              onClick={() => handleDeactivateEmployee(row)}
            >
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  if (loading) return <PageLoader />;
  if (!store) return null;

  const addr = store.address;
  const loc = store.location;
  const hasLocation = loc?.latitude && loc?.longitude;
  const category = categories.find((c) => c.id === store.categoryId);

  return (
    <section className="bg-surface text-brand flex-1 overflow-scroll">
      {/* Header — mirrors stores listing page */}
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none px-2"
            onClick={() => router.push('/dashboard/stores')}
          >
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-xl font-semibold uppercase">{store.name}</h1>
          <StatusBadge status={store.status} />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(store.slug);
              toast.success(`Copied: ${store.slug}`);
            }}
            className="cursor-pointer bg-gray-100 px-2.5 py-1.5 font-mono text-[11px] text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            /{store.slug}
          </button>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <EditStoreDialog
              store={store}
              onUpdated={fetchStore}
              trigger={<CustomButton size="sm">Edit Store</CustomButton>}
            />
          )}
          {canDelete && store.status !== 'inactive' && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none border border-gray-300 text-xs text-red-600 hover:border-red-400 hover:bg-red-50 dark:border-gray-800 dark:hover:border-red-900 dark:hover:bg-red-950/30"
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
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'cursor-pointer px-4 py-3 text-sm transition-colors',
                active
                  ? 'border-brand-purple text-brand-purple border-b-2 font-medium'
                  : 'text-gray-500 hover:text-brand dark:text-gray-400 dark:hover:text-brand',
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="px-8 py-6">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <SectionCard title="Store Details">
                <div className="space-y-3 text-sm">
                  <InfoRow label="Name" value={store.name} />
                  <InfoRow label="Category" value={category?.name || '—'} />
                  <InfoRow label="Status" value={store.status.replace('_', ' ')} />
                  <InfoRow label="Timezone" value={store.timezone || '—'} />
                  <InfoRow label="Phone" value={store.contactPhone || '—'} />
                  <InfoRow label="Email" value={store.contactEmail || '—'} />
                  <InfoRow label="Manager" value={store.managerId || 'Not assigned'} />
                </div>
              </SectionCard>

              <SectionCard title="Info" variant="muted">
                <div className="space-y-2 text-sm">
                  <InfoRow label="ID" value={store.id} mono />
                  <InfoRow label="Slug" value={store.slug} mono />
                  <InfoRow label="Created" value={new Date(store.createdAt).toLocaleDateString()} />
                  <InfoRow label="Updated" value={new Date(store.updatedAt).toLocaleDateString()} />
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Location" className="!p-0">
              {hasLocation && mapsLoaded ? (
                <div className="h-80 w-full overflow-hidden bg-gray-100 dark:bg-neutral-900">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: Number(loc.latitude), lng: Number(loc.longitude) }}
                    zoom={15}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true,
                      styles: storeMapStyles,
                      gestureHandling: 'cooperative',
                    }}
                  >
                    <MarkerF
                      position={{ lat: Number(loc.latitude), lng: Number(loc.longitude) }}
                      title={store.name}
                      icon={
                        {
                          path: STORE_PIN_PATH,
                          fillColor: STORE_PIN_COLOR,
                          fillOpacity: 1,
                          strokeWeight: 2,
                          strokeColor: 'white',
                          scale: 1,
                          labelOrigin: { x: 0, y: 0 },
                          anchor: { x: 0, y: 22 },
                        } as google.maps.Symbol
                      }
                    />
                  </GoogleMap>
                </div>
              ) : (
                <div className="flex h-80 items-center justify-center bg-gray-50 text-sm text-gray-400 dark:bg-neutral-900 dark:text-gray-500">
                  No coordinates on file.
                </div>
              )}

              <div className="flex items-start gap-2 border-t border-gray-200 p-4 text-sm dark:border-gray-800">
                <MapPin size={14} className="text-brand-purple mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {addr?.street && (
                    <div className="text-brand truncate">{addr.street}</div>
                  )}
                  <div className="text-gray-700 dark:text-gray-300">
                    {[addr?.city, addr?.state, addr?.postalCode].filter(Boolean).join(', ') ||
                      '—'}
                  </div>
                  {(addr?.country || hasLocation) && (
                    <div className="mt-0.5 font-mono text-[11px] text-gray-400 dark:text-gray-500">
                      {addr?.country || ''}
                      {hasLocation
                        ? ` · ${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}`
                        : ''}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'Surveys' && <ComingSoon feature="Surveys" compact />}

        {activeTab === 'Employees' && (
          <div className="flex w-full flex-col">
            {/* Toolbar — mirrors employees listing page */}
            <div className="mb-2 flex w-full items-center justify-between gap-2 py-2">
              <div className="flex w-full gap-2">
                <CustomInput.Text
                  placeholder="Search employees by name or email..."
                  value={empSearchInput}
                  onChange={(e) => setEmpSearchInput(e.target.value)}
                  autoComplete="off"
                  className="w-3/4"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex w-max items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                  <Users size={14} />
                  <span className="font-mono font-light">
                    {empTotal} Employee{empTotal !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex">
                  <Button
                    tooltip="Previous Page"
                    variant="ghost"
                    onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                    disabled={empPage <= 1}
                    className="flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-sm hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
                  >
                    &lt;
                  </Button>
                  <span className="flex h-full items-center justify-center rounded-none border-y px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {empPage}/{empTotalPages}
                  </span>
                  <Button
                    tooltip="Next Page"
                    variant="ghost"
                    onClick={() => setEmpPage((p) => Math.min(empTotalPages, p + 1))}
                    disabled={empPage >= empTotalPages}
                    className="flex h-full cursor-pointer items-center justify-center rounded-none border px-4 py-2 text-sm hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
                  >
                    &gt;
                  </Button>
                </div>
              </div>
            </div>
            <DataTable
              config={empTableConfig}
              data={employees}
              isLoading={empLoading}
              emptyMessage={
                empSearch ? 'No employees match your search.' : 'No employees in this store yet.'
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}
