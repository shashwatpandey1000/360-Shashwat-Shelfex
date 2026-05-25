'use client';

import { useState } from 'react';
import type { ScheduleSlot, SlotStatus, TemplateWithRules } from '@/lib/api/schedule.api';
import { useEmployeesQuery } from '@/hooks/queries/useEmployeeQueries';
import { useStoreEffectiveTemplateQuery, useScheduleTemplateQuery, useScheduleSlotsQuery } from '@/hooks/queries/useScheduleQueries';
import { useMaterializeTemplateMutation, useAssignSurveyorMutation } from '@/hooks/mutations/useScheduleMutations';
import { DataTable, TableConfig } from '@/components/common/table/dataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { CustomButton } from '@/components/common/button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MoreHorizontal, RefreshCw, CalendarDays, User, Loader2 } from 'lucide-react';
import TemplateCard from '@/components/schedule/TemplateCard';
import TemplateBuilderDialog from '@/components/schedule/TemplateBuilderDialog';

interface StoreScheduleTabProps {
  storeId: string;
  storeTimezone: string | null;
  canWrite: boolean;
  canManage: boolean;
}

const STATUS_OPTIONS: SlotStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'missed',
  'cancelled',
  'skipped',
  'excused',
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function StoreScheduleTab({
  storeId,
  storeTimezone,
  canWrite,
  canManage,
}: StoreScheduleTabProps) {
  // ── UI state ────────────────────────────────────────────────────────────
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithRules | undefined>();
  const [slotsPage, setSlotsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SlotStatus | ''>('');
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(plusDays(14));
  const [assignSlot, setAssignSlot] = useState<ScheduleSlot | null>(null);
  const [surveyorSearch, setSurveyorSearch] = useState('');
  const [selectedSurveyor, setSelectedSurveyor] = useState('');

  // ── Template queries ────────────────────────────────────────────────────
  const effectiveTemplateQuery = useStoreEffectiveTemplateQuery(storeId);
  const effectiveTemplateId = (effectiveTemplateQuery.data?.data as { id: string } | null)?.id ?? '';
  const templateQuery = useScheduleTemplateQuery(effectiveTemplateId);

  const templateLoading = effectiveTemplateQuery.isLoading;
  const template: TemplateWithRules | null | undefined =
    effectiveTemplateId
      ? (templateQuery.data?.data as TemplateWithRules | undefined)
      : effectiveTemplateQuery.isSuccess
        ? null
        : undefined;

  // ── Slots query ─────────────────────────────────────────────────────────
  const slotsQuery = useScheduleSlotsQuery({
    storeId,
    page: slotsPage,
    perPage: 25,
    dateFrom,
    dateTo,
    status: statusFilter || undefined,
    sortOrder: 'asc',
  });
  const slots = (slotsQuery.data?.data?.data as ScheduleSlot[] | undefined) ?? [];
  const slotsTotal = (slotsQuery.data?.data?.total as number | undefined) ?? 0;
  const slotsTotalPages = (slotsQuery.data?.data?.totalPages as number | undefined) ?? 1;
  const slotsLoading = slotsQuery.isLoading;

  // ── Surveyor search query (only when assign dialog is open) ─────────────
  const surveyorQuery = useEmployeesQuery({
    storeId,
    search: surveyorSearch || undefined,
    roleTemplate: 'surveyor',
    perPage: 20,
  });
  const surveyors = (surveyorQuery.data?.data?.data as Array<{ id: string; name: string | null; email: string }> | undefined) ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────
  const materializeMutation = useMaterializeTemplateMutation();
  const assignMutation = useAssignSurveyorMutation();

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleMaterialize = () => {
    if (!template || !effectiveTemplateId) return;
    materializeMutation.mutate(effectiveTemplateId, {
      onSuccess: (res) => {
        toast.success(`${res.data.created} slots created, ${res.data.skipped} already existed`);
      },
      onError: () => {
        toast.error('Failed to regenerate slots');
      },
    });
  };

  const handleAssign = () => {
    if (!assignSlot || !selectedSurveyor) return;
    assignMutation.mutate({ slotId: assignSlot.id, surveyorId: selectedSurveyor }, {
      onSuccess: () => {
        toast.success('Surveyor assigned');
        setAssignSlot(null);
        setSelectedSurveyor('');
      },
      onError: (err: any) => {
        if (err.response?.data?.data?.conflict) {
          toast.error('Surveyor has a conflicting slot at that time');
        } else {
          toast.error(err.response?.data?.message || 'Failed to assign');
        }
      },
    });
  };

  // ── Table config ────────────────────────────────────────────────────────
  const tableConfig: TableConfig<ScheduleSlot> = {
    uniqueKey: 'id',
    columns: [
      {
        heading: 'Date',
        field: 'scheduledDate',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => (
          <span className="font-mono text-xs">
            {new Date(row.scheduledDate).toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
        ),
      },
      {
        heading: 'Window',
        field: 'windowStartLocal',
        isSortable: false,
        visibleFrom: 'always',
        render: (row) => (
          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
            {new Date(row.windowStartLocal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(row.windowEndLocal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {row.windowLabel && (
              <span className="ml-1.5 text-gray-400">· {row.windowLabel}</span>
            )}
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
        field: 'assignedSurveyorName',
        isSortable: false,
        visibleFrom: 'md',
        render: (row) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.assignedSurveyorName || <span className="text-gray-300 dark:text-gray-600">Unassigned</span>}
          </span>
        ),
      },
    ],
    isSelectable: false,
    rowActions: canManage
      ? (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 rounded-none p-0 hover:bg-gray-200 dark:hover:bg-neutral-800">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem
                className="rounded-none"
                onClick={() => {
                  setAssignSlot(row);
                  setSelectedSurveyor(row.assignedSurveyorId || '');
                  setSurveyorSearch('');
                }}
              >
                <User size={13} className="mr-1.5" />
                Assign Surveyor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      : undefined,
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Active template ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Active Template
          </h2>
          <div className="flex gap-2">
            {canWrite && !!template && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-none border border-gray-200 px-3 text-xs dark:border-gray-700"
                  onClick={handleMaterialize}
                  disabled={materializeMutation.isPending}
                >
                  {materializeMutation.isPending
                    ? <Loader2 size={13} className="animate-spin" />
                    : <RefreshCw size={13} />}
                  Regenerate Slots
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-none border border-gray-200 px-3 text-xs dark:border-gray-700"
                  onClick={() => {
                    setEditingTemplate(template);
                    setBuilderOpen(true);
                  }}
                >
                  Edit Template
                </Button>
              </>
            )}
            {canWrite && !templateLoading && !template && (
              <CustomButton
                size="sm"
                onClick={() => {
                  setEditingTemplate(undefined);
                  setBuilderOpen(true);
                }}
              >
                Create Store Template
              </CustomButton>
            )}
          </div>
        </div>

        {templateLoading ? (
          <p className="py-4 text-sm text-gray-400 dark:text-gray-500">Loading template…</p>
        ) : template ? (
          <TemplateCard
            template={template}
            isDefault={template.storeId === null}
            canWrite={false}
            onEdit={() => {}}
            onDelete={() => {}}
            onMaterialize={handleMaterialize}
          />
        ) : (
          <div className="rounded-none border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No template. Falls back to org default if one exists.
            </p>
            {canWrite && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 rounded-none border border-gray-200 px-4 py-2 text-xs dark:border-gray-700"
                onClick={() => { setEditingTemplate(undefined); setBuilderOpen(true); }}
              >
                Create Store Override
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Slots table ── */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Survey Slots
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Date range */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setSlotsPage(1); }}
              className="rounded-none border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setSlotsPage(1); }}
              className="rounded-none border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
            />
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as SlotStatus | ''); setSlotsPage(1); }}
              className="rounded-none border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            {/* Count */}
            <div className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
              <CalendarDays size={12} />
              <span className="font-mono">{slotsTotal} slots</span>
            </div>
            {/* Pagination */}
            {slotsTotalPages > 1 && (
              <div className="flex">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSlotsPage((p) => Math.max(1, p - 1))}
                  disabled={slotsPage <= 1}
                  className="h-7 rounded-none border px-3 text-xs hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
                >&lt;</Button>
                <span className="flex h-7 items-center border-y px-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  {slotsPage}/{slotsTotalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSlotsPage((p) => Math.min(slotsTotalPages, p + 1))}
                  disabled={slotsPage >= slotsTotalPages}
                  className="h-7 rounded-none border px-3 text-xs hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800"
                >&gt;</Button>
              </div>
            )}
          </div>
        </div>
        <DataTable
          data={slots}
          config={tableConfig}
          isLoading={slotsLoading}
          emptyMessage="No slots in this date range."
        />
      </div>

      {/* ── Assign surveyor dialog ── */}
      <Dialog open={!!assignSlot} onOpenChange={(v) => { if (!v) setAssignSlot(null); }}>
        <DialogContent className="rounded-none p-0 sm:max-w-[440px]">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-base font-semibold">Assign Surveyor</DialogTitle>
            {assignSlot && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {new Date(assignSlot.scheduledDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                {' · '}
                {new Date(assignSlot.windowStartLocal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(assignSlot.windowEndLocal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </DialogHeader>
          <div className="px-6 py-5">
            <input
              type="text"
              placeholder="Search surveyors…"
              value={surveyorSearch}
              onChange={(e) => setSurveyorSearch(e.target.value)}
              className="mb-3 w-full rounded-none border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-100"
              autoFocus
            />
            <div className="max-h-52 overflow-y-auto">
              {surveyors.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                  No surveyors found for this store.
                </p>
              ) : (
                surveyors.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSurveyor(s.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedSurveyor === s.id
                        ? 'bg-brand-purple-soft text-brand-purple dark:bg-brand-purple/20'
                        : 'hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <User size={13} className="shrink-0 text-gray-400" />
                    <div>
                      <p className="font-medium">{s.name || s.email}</p>
                      {s.name && <p className="text-xs text-gray-400">{s.email}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <div className="flex w-full gap-2">
              <CustomButton
                size="sm"
                onClick={handleAssign}
                disabled={!selectedSurveyor || assignMutation.isPending}
              >
                {assignMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                Assign
              </CustomButton>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-none border border-gray-200 text-xs dark:border-gray-700"
                onClick={() => setAssignSlot(null)}
              >
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Template builder dialog ── */}
      <TemplateBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        template={editingTemplate}
        storeId={storeId}
        onSaved={() => {}}
      />
    </div>
  );
}
