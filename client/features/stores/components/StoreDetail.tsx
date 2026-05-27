'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployeesQuery } from '@/features/employees';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import PageLoader from '@/components/common/PageLoader';
import EditStoreDialog from './EditStoreDialog';
import StoreScheduleTab from './StoreScheduleTab';
import StoreSurveysTab from './StoreSurveysTab';
import type { Tour } from '@/features/tours';
import { toast } from 'sonner';
import { MapPin, MoreHorizontal, Pencil, Store, Trash2, Users } from 'lucide-react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/google-maps';
import { STORE_PIN_COLOR, STORE_PIN_PATH, storeMapStyles } from '@/lib/google-maps-styles';
import { cn } from '@/lib/utils';
import { useStoreByIdQuery } from '../queries';
import { useActiveStoreTourQuery, TourViewerModal } from '@/features/tours';
import { useStoreCategoriesQuery } from '@/features/lookups';
import { useDeactivateStoreMutation } from '../mutations';
import { useDeactivateEmployeeMutation } from '@/features/employees';

interface StoreDetailData {
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

const TABS = ['Overview', 'Surveys', 'Employees', 'Schedule'] as const;

const TOUR_STATUS_LABELS: Record<string, string> = {
  processing: 'Processing',
  active: 'Active',
  archived: 'Archived',
};

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

interface StoreDetailProps {
  id: string;
}

export default function StoreDetail({ id }: StoreDetailProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('stores:write');
  const canDelete = hasPermission('stores:delete');
  const canWriteSchedule = hasPermission('schedule:write');
  const canManageSchedule = hasPermission('employees:manage');

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview');
  const [empPage, setEmpPage] = useState(1);
  const [empSearch, setEmpSearch] = useState('');
  const [empSearchInput, setEmpSearchInput] = useState('');
  const [tourViewerOpen, setTourViewerOpen] = useState(false);

  const { isLoaded: mapsLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  // Queries
  const storeQuery = useStoreByIdQuery(id);
  const store = storeQuery.data?.data as StoreDetailData | undefined;

  const tourQuery = useActiveStoreTourQuery(id);
  const activeTour: Tour | null | undefined = tourQuery.isLoading
    ? undefined
    : (tourQuery.data?.data ?? null);

  const categoriesQuery = useStoreCategoriesQuery();
  const categories =
    (categoriesQuery.data?.data as { id: string; name: string }[] | undefined) ?? [];

  const employeesQuery = useEmployeesQuery({
    storeId: id,
    page: empPage,
    perPage: 25,
    search: empSearch || undefined,
    sortBy: 'roleTemplate',
    sortOrder: 'asc',
  });

  const employees = (employeesQuery.data?.data?.data as EmployeeRow[] | undefined) ?? [];
  const empTotal = (employeesQuery.data?.data?.total as number | undefined) ?? 0;
  const empTotalPages = (employeesQuery.data?.data?.totalPages as number | undefined) ?? 1;
  const empLoading = employeesQuery.isLoading && activeTab === 'Employees';

  // Mutations
  const deactivateStoreMutation = useDeactivateStoreMutation();
  const deactivateEmployeeMutation = useDeactivateEmployeeMutation();

  // Redirect on store not found
  useEffect(() => {
    if (storeQuery.isError) {
      toast.error('Store not found');
      router.push('/dashboard/stores');
    }
  }, [storeQuery.isError, router]);

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
    deactivateStoreMutation.mutate(store.id, {
      onSuccess: () => toast.success('Store deactivated'),
      onError: () => toast.error('Failed to deactivate'),
    });
  };

  const handleDeactivateEmployee = async (emp: EmployeeRow) => {
    deactivateEmployeeMutation.mutate(emp.id, {
      onSuccess: () => toast.success(`${emp.name || emp.email} deactivated`),
      onError: () => toast.error('Failed to deactivate employee'),
    });
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
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs dark:bg-neutral-800 dark:text-gray-300">
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
            className="bg-surface h-6 w-6 rounded-md p-0 hover:bg-gray-200 dark:hover:bg-neutral-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-md">
          <DropdownMenuItem
            className="rounded-md"
            onClick={() => router.push(`/dashboard/employees/${row.id}`)}
          >
            View Employee
          </DropdownMenuItem>
          {row.status !== 'inactive' && (
            <DropdownMenuItem
              className="rounded-md text-red-600"
              onClick={() => handleDeactivateEmployee(row)}
            >
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  if (storeQuery.isLoading) return <PageLoader />;
  if (!store) return null;

  const addr = store.address;
  const loc = store.location;
  const hasLocation = loc?.latitude && loc?.longitude;
  const category = categories.find((c) => c.id === store.categoryId);
  const cityStatePostal = [addr?.city, addr?.state, addr?.postalCode].filter(Boolean).join(', ');
  const coordinates = hasLocation
    ? `${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}`
    : '—';

  return (
    <section className="bg-surface text-brand flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-max w-full shrink-0 items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold uppercase">{store.name}</h1>
          <StatusBadge status={store.status} />
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(store.slug); toast.success(`Copied: ${store.slug}`); }}
            className="cursor-pointer rounded-md bg-gray-100 px-2.5 py-1.5 font-mono text-[11px] text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            /{store.slug}
          </button>
        </div>
        <div className="flex gap-2">
          {canDelete && store.status !== 'inactive' && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md border border-gray-300 text-xs text-red-600 hover:border-red-400 hover:bg-red-50 dark:border-gray-800 dark:hover:border-red-900 dark:hover:bg-red-950/30"
              onClick={handleDeactivate}
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b px-8">
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

      {activeTab === 'Overview' ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r">
            <div className="h-full min-h-0">
              {hasLocation && mapsLoaded ? (
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
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400 dark:bg-neutral-900 dark:text-gray-500">
                  No coordinates on file.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — store details sidebar */}
          <aside className="bg-surface-muted/40 flex w-[25rem] shrink-0 flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-800 dark:bg-neutral-950/60">
            {/* Store identity */}
            <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
              <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
                <span className={sidebarSectionTitleClass}>Store Profile</span>
                {canEdit && (
                  <EditStoreDialog
                    store={store}
                    onUpdated={() => {}}
                    trigger={
                      <button className={sidebarEditButtonClass}>
                        <Pencil size={13} />
                      </button>
                    }
                  />
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-gray-200 bg-white dark:border-gray-700 dark:bg-neutral-900">
                  <Store size={17} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-[15px] leading-5 font-semibold text-gray-900 dark:text-gray-100">
                    {store.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[12px] leading-5 text-gray-500 dark:text-gray-400">
                    /{store.slug}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-0 divide-y divide-gray-100 dark:divide-gray-800/80">
                <div className="grid min-h-9 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 py-2">
                  <span className="text-[13px] leading-5 text-gray-500 dark:text-gray-400">
                    Status
                  </span>
                  <div className="flex justify-end">
                    <StatusBadge status={store.status} />
                  </div>
                </div>
                <DetailRow label="Category" value={category?.name || '—'} />
                <DetailRow label="Timezone" value={store.timezone || '—'} />
                <DetailRow label="Phone" value={store.contactPhone || '—'} />
                <DetailRow label="Email" value={store.contactEmail || '—'} />
                <DetailRow label="Manager" value={store.managerId || 'Not assigned'} />
              </div>
            </div>

            {/* Address */}
            <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
              <span className={cn(sidebarSectionTitleClass, 'mb-4 block')}>Address</span>
              <div className="mb-4 flex items-start gap-3 border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-neutral-900">
                <div className="bg-brand-purple-soft dark:bg-brand-purple/20 flex h-9 w-9 shrink-0 items-center justify-center">
                  <MapPin size={15} className="text-brand-purple" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Store Location
                  </p>
                  <p className="mt-1 truncate text-[15px] font-medium text-gray-900 dark:text-gray-100">
                    {addr?.street || 'No street address on file'}
                  </p>
                  <p className="mt-0.5 text-[13px] text-gray-600 dark:text-gray-300">
                    {cityStatePostal || 'City, state, and postal code missing'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{addr?.country || 'Country unavailable'}</span>
                    {hasLocation && <span className="font-mono">{coordinates}</span>}
                  </div>
                </div>
              </div>
              <div>
                <DetailRow label="Street" value={addr?.street || '—'} />
                <DetailRow label="City/State" value={cityStatePostal || '—'} />
                <DetailRow label="Country" value={addr?.country || '—'} />
                <DetailRow label="Coordinates" value={coordinates} mono={hasLocation} />
              </div>
            </div>

            {/* Tour */}
            <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
              <span className={cn(sidebarSectionTitleClass, 'mb-4 block')}>360° Tour</span>
              {activeTour === undefined ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
              ) : activeTour ? (
                <div className="space-y-0">
                  <DetailRow label="Status" value={TOUR_STATUS_LABELS[activeTour.status] ?? activeTour.status} />
                  <DetailRow label="Version" value={`v${activeTour.version}`} />
                  <DetailRow label="Scenes" value={String(activeTour.sceneCount)} />
                  <DetailRow label="Shelves" value={String(activeTour.shelfCount)} />
                  <DetailRow label="Captured" value={new Date(activeTour.createdAt).toLocaleDateString()} />
                  <div className="pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => setTourViewerOpen(true)}
                    >
                      🔭 View Tour
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No tour yet. Store status will change to Active once a tour is synced.
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="px-5 py-5">
              <span className={cn(sidebarSectionTitleClass, 'mb-4 block')}>Metadata</span>
              <div>
                <DetailRow label="ID" value={store.id.slice(0, 8) + '…'} mono />
                <div className="grid min-h-9 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 border-b border-gray-100 py-2 dark:border-gray-800/80">
                  <span className="text-[13px] leading-5 text-gray-500 dark:text-gray-400">
                    Slug
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(store.slug);
                      toast.success(`Copied: ${store.slug}`);
                    }}
                    className="min-w-0 truncate text-right font-mono text-[12px] leading-5 text-gray-500 hover:underline dark:text-gray-400"
                  >
                    {store.slug}
                  </button>
                </div>
                <DetailRow label="Created" value={new Date(store.createdAt).toLocaleDateString()} />
                <DetailRow label="Updated" value={new Date(store.updatedAt).toLocaleDateString()} />
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">

          {activeTab === 'Surveys' && (
            <div className="px-8 py-6">
              <StoreSurveysTab storeId={store.id} />
            </div>
          )}

          {activeTab === 'Schedule' && (
            <div className="px-8 py-6">
              <StoreScheduleTab
                storeId={store.id}
                storeTimezone={store.timezone}
                canWrite={canWriteSchedule}
                canManage={canManageSchedule}
              />
            </div>
          )}

          {activeTab === 'Employees' && (
            <div className="flex w-full flex-col px-8 py-6">
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
                  <div className="flex w-max items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
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
                      className="flex h-full cursor-pointer items-center justify-center rounded-l-md border px-4 py-2 text-sm hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
                    >
                      &lt;
                    </Button>
                    <span className="flex h-full items-center justify-center border-y px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {empPage}/{empTotalPages}
                    </span>
                    <Button
                      tooltip="Next Page"
                      variant="ghost"
                      onClick={() => setEmpPage((p) => Math.min(empTotalPages, p + 1))}
                      disabled={empPage >= empTotalPages}
                      className="flex h-full cursor-pointer items-center justify-center rounded-r-md border px-4 py-2 text-sm hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
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
      )}
      {store && (
        <TourViewerModal
          storeId={id}
          storeName={store.name}
          open={tourViewerOpen}
          onClose={() => setTourViewerOpen(false)}
        />
      )}
    </section>
  );
}
