'use client';

import { useState } from 'react';
import { Clock, User, MoreHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import type { ScheduleSlot } from '../api';
import { useUpdateSlotStatusMutation } from '../mutations';
import { toast } from 'sonner';

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  slots: ScheduleSlot[];
  canWrite: boolean;
  onAssign: (slot: ScheduleSlot) => void;
  onRefresh: () => void;
}

const TERMINAL_STATUSES = new Set(['completed', 'missed', 'cancelled', 'skipped', 'excused']);

export default function DayDetailDialog({
  open,
  onOpenChange,
  date,
  slots,
  canWrite,
  onAssign,
  onRefresh,
}: DayDetailDialogProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const updateSlotStatus = useUpdateSlotStatusMutation();

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleStatusChange = async (
    slot: ScheduleSlot,
    status: 'cancelled' | 'skipped' | 'excused',
  ) => {
    setBusy(slot.id);
    try {
      await updateSlotStatus.mutateAsync({ slotId: slot.id, status });
      toast.success(`Slot ${status}`);
      onRefresh();
    } catch {
      toast.error('Failed to update slot status');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface max-h-[80vh] overflow-y-auto rounded-lg border border-gray-200 p-0 sm:max-w-2xl dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="border-b px-6 py-4 text-base font-semibold uppercase">
            {formatted}
          </DialogTitle>
        </DialogHeader>

        {slots.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No slots on this day.</p>
          </div>
        ) : (
          <div className="overflow-x-auto px-6 py-5">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/50 dark:bg-neutral-900/80">
                <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="py-2 pr-4 text-left font-medium">Window</th>
                  <th className="py-2 pr-4 text-left font-medium">Store</th>
                  <th className="py-2 pr-4 text-left font-medium">Surveyor</th>
                  <th className="py-2 pr-4 text-left font-medium">Status</th>
                  {canWrite && <th className="py-2 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr
                    key={slot.id}
                    className="border-b border-gray-200/80 bg-white hover:bg-gray-50 dark:border-gray-800/80 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                        <span>
                          {slot.windowStartLocal.substring(11, 16)} –{' '}
                          {slot.windowEndLocal.substring(11, 16)}
                        </span>
                        {slot.windowLabel && (
                          <span className="text-gray-500 dark:text-gray-400">
                            · {slot.windowLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400">
                      {slot.storeName ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      {slot.assignedSurveyorName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
                          {slot.assignedSurveyorName}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic dark:text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={slot.status} />
                    </td>
                    {canWrite && (
                      <td className="py-2.5 text-right">
                        {!TERMINAL_STATUSES.has(slot.status) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 rounded-md p-0 hover:bg-gray-100 dark:hover:bg-neutral-800"
                                disabled={busy === slot.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-md">
                              <DropdownMenuItem
                                className="rounded-md"
                                onClick={() => onAssign(slot)}
                              >
                                Assign Surveyor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(slot, 'cancelled')}
                                className="text-destructive focus:text-destructive rounded-md"
                              >
                                Cancel Slot
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-md"
                                onClick={() => handleStatusChange(slot, 'skipped')}
                              >
                                Mark Skipped
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-md"
                                onClick={() => handleStatusChange(slot, 'excused')}
                              >
                                Mark Excused
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
