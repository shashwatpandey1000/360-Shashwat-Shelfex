'use client';

import { useCallback, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, DatesSetArg, EventClickArg } from '@fullcalendar/core';
import type { ScheduleSlot } from '@/lib/api/schedule.api';
import { useScheduleSlotsQuery } from '@/hooks/queries/useScheduleQueries';
import DayDetailDialog from './DayDetailDialog';
import AssignSurveyorDialog from './AssignSurveyorDialog';

// ─── Status colour map ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#c4ffdf', text: '#166534' },
  missed: { bg: '#fee2e2', text: '#991b1b' },
  cancelled: { bg: '#e5e7eb', text: '#6b7280' },
  skipped: { bg: '#f3f4f6', text: '#9ca3af' },
  excused: { bg: '#ede9fe', text: '#6d28d9' },
};

interface ScheduleCalendarProps {
  storeId?: string;
  canWrite: boolean;
}

export default function ScheduleCalendar({ storeId, canWrite }: ScheduleCalendarProps) {
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignSlot, setAssignSlot] = useState<ScheduleSlot | null>(null);

  const slotsQuery = useScheduleSlotsQuery(
    dateRange ? { dateFrom: dateRange.from, dateTo: dateRange.to, storeId, perPage: 500 } : undefined,
    { enabled: !!dateRange },
  );
  const slots: ScheduleSlot[] = slotsQuery.data?.data?.data ?? [];
  const loading = slotsQuery.isLoading || slotsQuery.isFetching;

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const from = arg.startStr.substring(0, 10);
    const to = arg.endStr.substring(0, 10);
    setDateRange({ from, to });
  }, []);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map: Record<string, ScheduleSlot[]> = {};
    for (const slot of slots) {
      const date = slot.scheduledDate;
      if (!map[date]) map[date] = [];
      map[date].push(slot);
    }
    return map;
  }, [slots]);

  // Build FullCalendar events — one event per status group per day
  const events: EventInput[] = useMemo(() => {
    const result: EventInput[] = [];
    for (const [date, daySlots] of Object.entries(slotsByDate)) {
      const byStatus: Record<string, number> = {};
      for (const s of daySlots) {
        byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      }
      for (const [status, count] of Object.entries(byStatus)) {
        const color = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#374151' };
        result.push({
          id: `${date}-${status}`,
          title: `${count} ${status.replace('_', ' ')}`,
          start: date,
          allDay: true,
          backgroundColor: color.bg,
          borderColor: color.bg,
          textColor: color.text,
          extendedProps: { date, status },
        });
      }
    }
    return result;
  }, [slotsByDate]);

  const selectedDaySlots = useMemo(
    () => (selectedDate ? slotsByDate[selectedDate] ?? [] : []),
    [selectedDate, slotsByDate],
  );

  const handleDateClick = useCallback((info: { dateStr: string }) => {
    setSelectedDate(info.dateStr);
    setDayDialogOpen(true);
  }, []);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const date = info.event.extendedProps['date'] as string;
      setSelectedDate(date);
      setDayDialogOpen(true);
    },
    [],
  );

  const handleAssign = useCallback((slot: ScheduleSlot) => {
    setAssignSlot(slot);
    setAssignDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    slotsQuery.refetch();
  }, [slotsQuery]);

  return (
    <>
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-neutral-950">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-black/50">
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading…</span>
          </div>
        )}
        <div className="schedule-calendar bg-white p-4 dark:bg-neutral-950">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek',
            }}
            height="auto"
            events={events}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDisplay="block"
            dayMaxEvents={4}
          />
        </div>
      </div>

      <DayDetailDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDate}
        slots={selectedDaySlots}
        canWrite={canWrite}
        onAssign={(slot) => {
          setDayDialogOpen(false);
          handleAssign(slot);
        }}
        onRefresh={handleRefresh}
      />

      {assignSlot && (
        <AssignSurveyorDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          slot={assignSlot}
          onAssigned={() => {
            handleRefresh();
            setAssignDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
