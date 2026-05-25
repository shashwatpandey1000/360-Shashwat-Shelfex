'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSurveysQuery } from '@/hooks/queries/useSurveyQueries';
import type { Survey } from '@/lib/api/surveys.api';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarDays, MoreHorizontal } from 'lucide-react';

interface StoreSurveysTabProps {
  storeId: string;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function minusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function StoreSurveysTab({ storeId }: StoreSurveysTabProps) {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(minusDays(30));
  const [dateTo, setDateTo] = useState(todayStr());

  const surveysQuery = useSurveysQuery({
    storeId,
    page,
    perPage: 25,
    status: (statusFilter as any) || undefined,
    dateFrom,
    dateTo,
    sortOrder: 'desc',
  });

  const surveys: Survey[] = surveysQuery.data?.data?.data ?? [];
  const total = surveysQuery.data?.data?.total ?? 0;
  const totalPages = surveysQuery.data?.data?.totalPages ?? 1;
  const loading = surveysQuery.isLoading;

  const tableConfig: TableConfig<Survey> = {
    uniqueKey: 'id',
    columns: [
      {
        heading: 'Date',
        field: 'startedAt',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => (
          <span className="font-mono text-xs">
            {new Date(row.startedAt).toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            })}
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
        heading: 'Surveyor',
        field: 'surveyorName',
        isSortable: false,
        visibleFrom: 'md',
        render: (row) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {row.surveyorName || <span className="text-gray-400">—</span>}
          </span>
        ),
      },
      {
        heading: 'Scenes',
        field: 'sceneCount',
        isSortable: false,
        visibleFrom: 'lg',
        render: (row) => <span className="font-mono text-xs text-gray-500">{row.sceneCount}</span>,
      },
      {
        heading: 'Photos',
        field: 'shelfCount',
        isSortable: false,
        visibleFrom: 'lg',
        render: (row) => <span className="font-mono text-xs text-gray-500">{row.shelfCount}</span>,
      },
      {
        heading: 'Duration',
        field: 'durationSeconds',
        isSortable: false,
        visibleFrom: 'xl',
        render: (row) => (
          <span className="font-mono text-xs text-gray-500">
            {row.durationSeconds != null
              ? `${Math.floor(row.durationSeconds / 60)}m ${row.durationSeconds % 60}s`
              : '—'}
          </span>
        ),
      },
    ],
    isSelectable: false,
    rowActions: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-6 w-6 rounded-none p-0 hover:bg-gray-200 dark:hover:bg-neutral-800">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none">
          <DropdownMenuItem
            className="rounded-none"
            onClick={() => router.push(`/dashboard/surveys/${row.id}`)}
          >
            View Survey
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
          <CalendarDays size={12} />
          <span className="font-mono">{total} surveys</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-none border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-none border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-none border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
          >
            <option value="">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
          </select>
          {totalPages > 1 && (
            <div className="flex">
              <Button
                variant="ghost" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 rounded-none border px-3 text-xs hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
              >&lt;</Button>
              <span className="flex h-7 items-center border-y px-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
                {page}/{totalPages}
              </span>
              <Button
                variant="ghost" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 rounded-none border px-3 text-xs hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
              >&gt;</Button>
            </div>
          )}
        </div>
      </div>

      <DataTable
        data={surveys}
        config={tableConfig}
        isLoading={loading}
        emptyMessage="No surveys in this date range."
      />
    </div>
  );
}
