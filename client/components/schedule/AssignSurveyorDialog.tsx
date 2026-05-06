'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employeesApi } from '@/lib/api/employees.api';
import apiClient from '@/lib/api/client';
import type { ScheduleSlot } from '@/lib/api/schedule.api';

interface Surveyor {
  id: string;
  name: string;
  email: string;
}

interface AssignSurveyorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: ScheduleSlot;
  onAssigned: () => void;
}

export default function AssignSurveyorDialog({
  open,
  onOpenChange,
  slot,
  onAssigned,
}: AssignSurveyorDialogProps) {
  const [surveyors, setSurveyors] = useState<Surveyor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(slot.assignedSurveyorId ?? '');
    setConflict(false);
    setLoading(true);
    employeesApi
      .list({ roleTemplate: 'surveyor', status: 'active', perPage: 200 })
      .then((res) => setSurveyors(res.data?.data ?? []))
      .catch(() => toast.error('Failed to load surveyors'))
      .finally(() => setLoading(false));
  }, [open, slot]);

  const handleAssign = async (force = false) => {
    if (!selectedId) return toast.error('Select a surveyor');
    setSaving(true);
    setConflict(false);
    try {
      await apiClient.patch(`/schedules/slots/${slot.id}/assign`, {
        surveyorId: selectedId,
        force,
      });
      toast.success('Surveyor assigned');
      onAssigned();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { conflict?: boolean; message?: string } } };
      if (axiosErr.response?.data?.conflict) {
        setConflict(true);
        return;
      }
      toast.error(axiosErr.response?.data?.message ?? 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  const windowStart = slot.windowStartLocal?.substring(11, 16) ?? '';
  const windowEnd = slot.windowEndLocal?.substring(11, 16) ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface rounded-lg border border-gray-200 p-0 sm:max-w-md dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="border-b px-6 py-4 text-base font-semibold uppercase">
            Assign Surveyor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Slot info */}
          <div className="bg-surface-muted/30 space-y-1 rounded-md border border-gray-200 px-4 py-3 text-sm dark:border-gray-800 dark:bg-neutral-900/50">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {slot.storeName ?? 'Unknown Store'}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {slot.scheduledDate} · {windowStart}–{windowEnd}
              </span>
              {slot.windowLabel && <span>· {slot.windowLabel}</span>}
            </div>
            {slot.assignedSurveyorName && (
              <div className="flex items-center gap-2 pt-0.5 text-xs text-gray-500 dark:text-gray-400">
                <User className="h-3.5 w-3.5" />
                <span>Currently: {slot.assignedSurveyorName}</span>
              </div>
            )}
          </div>

          {/* Conflict warning */}
          {conflict && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Schedule conflict</p>
                <p className="mt-0.5 text-xs">
                  This surveyor already has an overlapping slot. Confirm to assign anyway.
                </p>
              </div>
            </div>
          )}

          {/* Surveyor select */}
          <div className="space-y-2">
            <label className="text-brand text-[14px] font-medium">Surveyor</label>
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading surveyors…</p>
            ) : (
              <Select
                value={selectedId}
                onValueChange={(v) => {
                  if (typeof v === 'string') {
                    setSelectedId(v);
                    setConflict(false);
                  }
                }}
              >
                <SelectTrigger className="bg-surface dark:bg-surface-muted h-9 w-full rounded-lg border-gray-300 px-3 text-[13px] dark:border-gray-800">
                  <SelectValue placeholder="Select a surveyor" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {surveyors.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      className="rounded-lg py-2 pr-8 pl-2.5 text-[13px]"
                    >
                      {s.name} — {s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="ghost"
            className="rounded-lg border px-4 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {conflict ? (
            <Button
              variant="default"
              onClick={() => handleAssign(true)}
              disabled={saving}
              className="rounded-lg bg-yellow-600 px-4 text-[13px] text-white hover:bg-yellow-700"
            >
              {saving ? 'Assigning…' : 'Assign Anyway'}
            </Button>
          ) : (
            <Button
              className="rounded-lg px-4 text-[13px]"
              onClick={() => handleAssign(false)}
              disabled={saving || !selectedId}
            >
              {saving ? 'Assigning…' : 'Assign'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
