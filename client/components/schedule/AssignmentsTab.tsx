'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Trash2, User, Clock, Store, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { useScheduleAssignmentsQuery } from '@/hooks/queries/useScheduleQueries';
import { useStoreEffectiveTemplateQuery, useScheduleTemplateQuery } from '@/hooks/queries/useScheduleQueries';
import { useStoresQuery } from '@/hooks/queries/useStoreQueries';
import { useEmployeesQuery } from '@/hooks/queries/useEmployeeQueries';
import {
  useCreateAssignmentMutation,
  useDeleteAssignmentMutation,
} from '@/hooks/mutations/useScheduleMutations';
import type { PersistentAssignment } from '@/lib/api/schedule.api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Surveyor {
  id: string;
  name: string;
  email: string;
}

interface StoreOption {
  id: string;
  name: string;
}

interface RuleWindowOption {
  ruleId: string;
  ruleLabel: string;
  windowId: string;
  windowLabel: string;
}

interface AssignmentsTabProps {
  canWrite: boolean;
  storeId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignmentsTab({ canWrite, storeId }: AssignmentsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const assignmentsQuery = useScheduleAssignmentsQuery(storeId);
  const assignments: PersistentAssignment[] = assignmentsQuery.data?.data ?? [];
  const deleteAssignment = useDeleteAssignmentMutation();

  const handleDelete = async (id: string) => {
    try {
      await deleteAssignment.mutateAsync(id);
      toast.success('Assignment removed');
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  if (assignmentsQuery.isLoading) {
    return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Persistent assignments auto-apply when slots are materialized. They also propagate to
            existing future pending slots.
          </p>
        </div>
        {canWrite && (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-md border px-4 py-2 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
            onClick={() => setDialogOpen(true)}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Add Assignment
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="bg-surface-muted/20 rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700 dark:bg-neutral-900/40">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-neutral-950">
            <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </span>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            No persistent assignments
          </p>
          <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
            Assign surveyors to recurring windows so they&apos;re auto-populated on new slots.
          </p>
          {canWrite && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-4 rounded-md border px-4 py-2 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
              onClick={() => setDialogOpen(true)}
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Add Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/50 dark:bg-neutral-900/80">
              <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-2.5 text-left font-medium">Store</th>
                <th className="px-4 py-2.5 text-left font-medium">Window</th>
                <th className="px-4 py-2.5 text-left font-medium">Surveyor</th>
                {canWrite && <th className="px-4 py-2.5 text-right font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-200/80 bg-white hover:bg-gray-50 dark:border-gray-800/80 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                      {a.storeName ?? a.storeId.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {a.windowStart && a.windowEnd ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                        {a.windowStart.substring(0, 5)} – {a.windowEnd.substring(0, 5)}
                        {a.windowLabel && (
                          <span className="text-gray-500 dark:text-gray-400">
                            · {a.windowLabel}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                      {a.surveyorName ?? a.surveyorId.slice(0, 8)}
                    </div>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 rounded-md p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddAssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStoreId={storeId}
        onCreated={() => setDialogOpen(false)}
      />
    </div>
  );
}

// ─── Add Assignment Dialog ────────────────────────────────────────────────────

interface AddAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStoreId?: string;
  onCreated: () => void;
}

const RECURRENCE_SHORT: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  specific_days: 'Specific days',
  odd_days: 'Odd days',
  even_days: 'Even days',
  interval: 'Interval',
};

function AddAssignmentDialog({
  open,
  onOpenChange,
  defaultStoreId,
  onCreated,
}: AddAssignmentDialogProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(defaultStoreId ?? '');
  const [selectedRuleWindow, setSelectedRuleWindow] = useState('');
  const [selectedSurveyorId, setSelectedSurveyorId] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedStoreId(defaultStoreId ?? '');
    setSelectedRuleWindow('');
    setSelectedSurveyorId('');
  }, [open, defaultStoreId]);

  const storesQuery = useStoresQuery({ perPage: 200 });
  const stores: StoreOption[] = storesQuery.data?.data?.data ?? [];

  const surveyorsQuery = useEmployeesQuery({ roleTemplate: 'surveyor', status: 'active', perPage: 200 });
  const surveyors: Surveyor[] = surveyorsQuery.data?.data?.data ?? [];

  const effectiveStoreId = selectedStoreId || defaultStoreId || '';
  const effectiveTemplateQuery = useStoreEffectiveTemplateQuery(effectiveStoreId);
  const templateId = effectiveTemplateQuery.data?.data?.id ?? '';
  const templateQuery = useScheduleTemplateQuery(templateId);

  const ruleWindows: RuleWindowOption[] = useMemo(() => {
    const rules = templateQuery.data?.data?.rules;
    if (!rules) return [];
    const opts: RuleWindowOption[] = [];
    for (const rule of rules) {
      const ruleLabel = RECURRENCE_SHORT[rule.recurrenceType] ?? rule.recurrenceType;
      for (const win of rule.windows) {
        opts.push({
          ruleId: rule.id,
          ruleLabel,
          windowId: win.id,
          windowLabel: `${ruleLabel} · ${win.windowStart.substring(0, 5)}–${win.windowEnd.substring(0, 5)}${win.label ? ' · ' + win.label : ''}`,
        });
      }
    }
    return opts;
  }, [templateQuery.data]);

  const createAssignment = useCreateAssignmentMutation();
  const loadingOptions = surveyorsQuery.isLoading || (!defaultStoreId && storesQuery.isLoading);

  const handleCreate = async () => {
    const storeId = selectedStoreId || defaultStoreId;
    if (!storeId) return toast.error('Select a store');
    if (!selectedRuleWindow) return toast.error('Select a time window');
    if (!selectedSurveyorId) return toast.error('Select a surveyor');

    const [ruleId, windowId] = selectedRuleWindow.split('::');

    try {
      await createAssignment.mutateAsync({
        storeId,
        recurrenceRuleId: ruleId,
        timeWindowId: windowId,
        surveyorId: selectedSurveyorId,
      });
      toast.success('Assignment created');
      onCreated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to create assignment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface max-h-[90vh] overflow-y-auto rounded-lg border border-gray-200 p-0 sm:max-w-md dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="border-b px-6 py-4 text-base font-semibold uppercase">
            Add Persistent Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="bg-surface-muted/30 rounded-md border border-gray-200 px-4 py-3 dark:border-gray-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-300">
              <Link2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              Create a recurring surveyor assignment for a store window.
            </div>
          </div>
          {loadingOptions ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading options…</p>
          ) : (
            <>
              {!defaultStoreId && (
                <div className="space-y-2">
                  <label className="text-brand text-[14px] font-medium">Store</label>
                  <Select
                    value={selectedStoreId}
                    onValueChange={(v) => {
                      if (typeof v === 'string') {
                        setSelectedStoreId(v);
                        setSelectedRuleWindow('');
                      }
                    }}
                  >
                    <SelectTrigger className="bg-surface dark:bg-surface-muted h-9 w-full rounded-md border-gray-300 px-3 text-[13px] dark:border-gray-800">
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {stores.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          className="rounded-md py-2 pr-8 pl-2.5 text-[13px]"
                        >
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-brand text-[14px] font-medium">Time Window</label>
                <Select
                  value={selectedRuleWindow}
                  onValueChange={(v) => {
                    if (typeof v === 'string') setSelectedRuleWindow(v);
                  }}
                  disabled={ruleWindows.length === 0}
                >
                  <SelectTrigger className="bg-surface dark:bg-surface-muted h-9 w-full rounded-md border-gray-300 px-3 text-[13px] dark:border-gray-800">
                    <SelectValue
                      placeholder={
                        ruleWindows.length === 0 ? 'Select a store first' : 'Select a window'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {ruleWindows.map((rw) => (
                      <SelectItem
                        key={`${rw.ruleId}::${rw.windowId}`}
                        value={`${rw.ruleId}::${rw.windowId}`}
                        className="rounded-md py-2 pr-8 pl-2.5 text-[13px]"
                      >
                        {rw.windowLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-brand text-[14px] font-medium">Surveyor</label>
                <Select
                  value={selectedSurveyorId}
                  onValueChange={(v) => {
                    if (typeof v === 'string') setSelectedSurveyorId(v);
                  }}
                >
                  <SelectTrigger className="bg-surface dark:bg-surface-muted h-9 w-full rounded-md border-gray-300 px-3 text-[13px] dark:border-gray-800">
                    <SelectValue placeholder="Select a surveyor" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {surveyors.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="rounded-md py-2 pr-8 pl-2.5 text-[13px]"
                      >
                        {s.name} — {s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="ghost"
            className="rounded-md border px-4 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
            onClick={() => onOpenChange(false)}
            disabled={createAssignment.isPending}
          >
            Cancel
          </Button>
          <Button
            className="rounded-md px-4 text-[13px]"
            onClick={handleCreate}
            disabled={createAssignment.isPending || loadingOptions}
          >
            {createAssignment.isPending ? 'Saving…' : 'Create Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
