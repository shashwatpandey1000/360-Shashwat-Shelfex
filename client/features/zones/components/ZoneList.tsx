'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ArrowLeft, Map } from 'lucide-react';
import { toast } from 'sonner';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { useZonesQuery, useAllZonesQuery } from '../queries';
import { useDeleteZoneMutation } from '../mutations';
import AddZoneDialog from './AddZoneDialog';
import EditZoneDialog from './EditZoneDialog';

interface ZoneRow {
  id: string;
  name: string;
  description: string | null;
  parentZoneId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ZoneList() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingZone, setEditingZone] = useState<ZoneRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: res, isLoading } = useZonesQuery({
    page: currentPage,
    perPage,
    search: search || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const { data: allZonesRes } = useAllZonesQuery();

  const zoneList = res?.data?.data ?? [];
  const totalCount = res?.data?.total ?? 0;
  const totalPages = res?.data?.totalPages ?? 1;
  const allZones = allZonesRes?.data ?? [];

  const deleteMutation = useDeleteZoneMutation();
  const handleDelete = (zone: ZoneRow) => {
    deleteMutation.mutate(zone.id, {
      onSuccess: () => toast.success(`${zone.name} deleted`),
      onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete zone'),
    });
  };

  const getParentName = (parentZoneId: string | null) => {
    if (!parentZoneId) return '—';
    const parent = allZones.find((z: { id: string; name: string; parentZoneId: string | null }) => z.id === parentZoneId);
    return parent?.name || '—';
  };

  const tableConfig: TableConfig<ZoneRow> = {
    uniqueKey: 'id',
    columns: [
      {
        heading: 'Zone Name',
        field: 'name',
        isSortable: true,
        visibleFrom: 'always',
      },
      {
        heading: 'Parent Zone',
        field: 'parentZoneId',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => (
          <span className="text-gray-500">{getParentName(row.parentZoneId)}</span>
        ),
      },
      {
        heading: 'Description',
        field: 'description',
        isSortable: false,
        visibleFrom: 'md',
        render: (row) => (
          <span className="text-gray-500">{row.description || '—'}</span>
        ),
      },
      {
        heading: 'Created',
        field: 'createdAt',
        isSortable: true,
        visibleFrom: 'xl',
        render: (row) => (
          <span className="text-xs text-gray-500">
            {new Date(row.createdAt).toLocaleDateString()}
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
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-md">
          <DropdownMenuItem className="rounded-md" onClick={() => setEditingZone(row)}>
            Edit Zone
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-md text-red-600" onClick={() => handleDelete(row)}>
            Delete Zone
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <section className="flex-1 overflow-scroll">
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-md px-2"
            onClick={() => router.push('/dashboard/stores')}
          >
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-xl font-semibold uppercase">Zones</h1>
          <div className="flex w-max items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
            <Map size={14} />
            <span className="font-mono font-light">{totalCount} Zones</span>
          </div>
        </div>
        <AddZoneDialog
          allZones={allZones}
          onCreated={() => {}}
          trigger={<CustomButton size="sm">Add Zone</CustomButton>}
        />
      </div>

      <div className="flex h-full w-full flex-col px-8 py-4">
        <div className="mb-2 flex w-full items-center justify-between gap-2 py-2">
          <div className="flex w-full gap-2">
            <CustomInput.Text
              id="search-zones"
              placeholder="Search zones..."
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

        <DataTable
          data={zoneList}
          config={tableConfig}
          isLoading={isLoading}
          emptyMessage={
            search ? 'No zones match your search.' : 'No zones yet. Create your first zone to group stores by geography.'
          }
        />
      </div>

      {editingZone && (
        <EditZoneDialog
          zone={editingZone}
          allZones={allZones}
          onUpdated={() => setEditingZone(null)}
          onClose={() => setEditingZone(null)}
        />
      )}
    </section>
  );
}
