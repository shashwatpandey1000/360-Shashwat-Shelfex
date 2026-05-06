'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Store, Map } from 'lucide-react';
import { toast } from 'sonner';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { storesApi } from '@/lib/api/stores.api';
import StatusBadge from '@/components/common/StatusBadge';
import AddStoreDialog from './components/AddStoreDialog';
import BulkImportDialog from './components/BulkImportDialog';
import MapView from './components/MapView';

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: { street?: string; city?: string; state?: string; country?: string } | null;
  location: { latitude?: number; longitude?: number } | null;
  timezone: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  categoryId: string | null;
  managerId: string | null;
  createdAt: string;
}

export default function StoresPage() {
  return (
    <Suspense>
      <StoresContent />
    </Suspense>
  );
}

function StoresContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<StoreRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const isMapView = searchParams.get('view') === 'map';

  // Fetch stores from API (server-side pagination + search)
  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await storesApi.list({
        page: currentPage,
        perPage,
        search: search || undefined,
        status: (statusFilter as any) || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setData(res.data.data);
      setTotalCount(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, search, statusFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Debounce search — wait 400ms after typing stops before fetching
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleView = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isMapView) {
      params.delete('view');
    } else {
      params.set('view', 'map');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDeactivate = async (store: StoreRow) => {
    try {
      await storesApi.deactivate(store.id);
      toast.success(`${store.name} deactivated`);
      fetchStores();
    } catch {
      toast.error('Failed to deactivate store');
    }
  };

  const tableConfig: TableConfig<StoreRow> = {
    uniqueKey: 'id',
    columns: [
      {
        heading: 'Store Name',
        field: 'name',
        isSortable: true,
        visibleFrom: 'always',
      },
      {
        heading: 'City',
        field: 'address',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => <span>{(row.address as any)?.city || '—'}</span>,
      },
      {
        heading: 'Status',
        field: 'status',
        isSortable: true,
        visibleFrom: 'always',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        heading: 'Phone',
        field: 'contactPhone',
        isSortable: false,
        visibleFrom: 'xl',
        render: (row) => <span>{row.contactPhone || '—'}</span>,
      },
      {
        heading: 'Slug',
        field: 'slug',
        isSortable: false,
        visibleFrom: 'xl',
        render: (row) => (
          <span
            onClick={() => {
              navigator.clipboard.writeText(row.slug);
              toast.success(`Copied slug: ${row.slug}`);
            }}
            className="cursor-pointer font-mono text-xs text-gray-500 hover:underline"
          >
            {row.slug}
          </span>
        ),
      },
    ],
    isSelectable: true,
    onSelect: (selectedRows) => {
      console.log('Selected:', selectedRows);
    },
    rowActions: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="bg-surface h-6 w-6 rounded-md p-0 hover:bg-gray-200 dark:hover:bg-neutral-800"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-md">
          <DropdownMenuItem
            className="rounded-md"
            onClick={() => router.push(`/dashboard/stores/${row.id}`)}
          >
            View Store
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-md"
            onClick={() => router.push(`/dashboard/stores/${row.id}?edit=true`)}
          >
            Edit Store
          </DropdownMenuItem>
          {row.status !== 'inactive' && (
            <DropdownMenuItem
              className="rounded-md text-red-600"
              onClick={() => handleDeactivate(row)}
            >
              Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <section className="flex-1 overflow-scroll">
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold uppercase">Stores</h1>
          <div className="flex w-max items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
            <Store size={14} />
            <span className="font-mono font-light">{totalCount} Stores</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/stores/zones')}
            className="h-max rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-200 hover:underline dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            <Map size={14} className="mr-1" />
            Manage Zones
          </Button>
          <Button
            tooltip={isMapView ? 'Switch to List View' : 'Switch to Map View'}
            variant="ghost"
            onClick={toggleView}
            className="h-max rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-200 hover:underline dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            {isMapView ? 'List View' : 'Map View'}
          </Button>
        </div>
        <div className="flex gap-2">
          <AddStoreDialog
            onCreated={fetchStores}
            trigger={<CustomButton size="sm">Add Store</CustomButton>}
          />
          <BulkImportDialog
            onImported={fetchStores}
            trigger={<CustomButton size="sm">Add Stores in Bulk</CustomButton>}
          />
        </div>
      </div>
      <div className="flex h-full w-full flex-col px-8 py-4">
        <div className="mb-2 flex w-full items-center justify-between gap-2 py-2">
          <div className="flex w-full gap-2">
            <CustomInput.Text
              id="search-stores"
              placeholder="Search stores..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              className="w-3/4"
            />
          </div>
          <div className="flex w-max justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-full cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-[13px] text-gray-700 hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
                >
                  {statusFilter ? `Status: ${statusFilter.replace('_', ' ')}` : 'All Status'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full min-w-36 rounded-md">
                <DropdownMenuItem
                  className="rounded-md"
                  onClick={() => {
                    setStatusFilter('');
                    setCurrentPage(1);
                  }}
                >
                  All
                </DropdownMenuItem>
                {['active', 'pending_tour', 'inactive'].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className="rounded-md"
                    onClick={() => {
                      setStatusFilter(s);
                      setCurrentPage(1);
                    }}
                  >
                    {s.replace('_', ' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="group flex h-full cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-[13px] text-gray-700 hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
                >
                  Per Page: {perPage}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full min-w-30 rounded-md">
                {[10, 25, 50, 100].map((n) => (
                  <DropdownMenuItem
                    key={n}
                    className="rounded-md"
                    onClick={() => {
                      setPerPage(n);
                      setCurrentPage(1);
                    }}
                  >
                    {n}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex">
              <Button
                tooltip="Previous Page"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex h-full cursor-pointer items-center justify-center rounded-l-md border px-4 py-2 text-sm hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
              >
                &lt;
              </Button>
              <span className="flex h-full items-center justify-center border-y px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                {currentPage}/{totalPages}
              </span>
              <Button
                tooltip="Next Page"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex h-full cursor-pointer items-center justify-center rounded-r-md border px-4 py-2 text-sm hover:border-black hover:bg-gray-200 dark:text-gray-300 dark:hover:border-white dark:hover:bg-neutral-800"
              >
                &gt;
              </Button>
            </div>
          </div>
        </div>
        {isMapView ? (
          <MapView data={data} isLoading={isLoading} />
        ) : (
          <DataTable
            data={data}
            config={tableConfig}
            isLoading={isLoading}
            emptyMessage={search ? 'No stores match your search.' : 'No stores added yet.'}
          />
        )}
      </div>
    </section>
  );
}
