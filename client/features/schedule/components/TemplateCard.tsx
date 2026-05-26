'use client';

import { Calendar, Clock, Pencil, Trash2, RefreshCw, Globe, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TemplateWithRules } from '../api';

interface TemplateCardProps {
  template: TemplateWithRules;
  isDefault?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMaterialize: () => void;
  canWrite: boolean;
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays (Mon–Fri)',
  specific_days: 'Specific days',
  odd_days: 'Odd calendar days',
  even_days: 'Even calendar days',
  interval: 'Every N days/weeks',
  custom_rrule: 'Custom rule',
};

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TemplateCard({
  template,
  isDefault,
  onEdit,
  onDelete,
  onMaterialize,
  canWrite,
}: TemplateCardProps) {
  const totalWindows = template.rules.reduce((acc, r) => acc + r.windows.length, 0);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isDefault ? (
            <Globe className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
          ) : (
            <Store className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
          )}
          <div>
            <p className="text-sm leading-tight font-medium text-gray-900 dark:text-gray-100">
              {template.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{template.timezone}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant={template.isActive ? 'default' : 'secondary'}
            className="rounded-lg text-[11px]"
          >
            {template.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Effective dates */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          From {template.effectiveFrom}
          {template.effectiveUntil ? ` → ${template.effectiveUntil}` : ' (no end date)'}
        </span>
      </div>

      {/* Rules summary */}
      {template.rules.length === 0 ? (
        <p className="text-xs text-gray-500 italic dark:text-gray-400">No rules configured yet</p>
      ) : (
        <div className="space-y-2">
          {template.rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-surface-muted/40 space-y-1 rounded-md border border-gray-200 px-3 py-2 text-xs dark:border-gray-800"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {RECURRENCE_LABELS[rule.recurrenceType] ?? rule.recurrenceType}
                {rule.recurrenceType === 'specific_days' && rule.daysOfWeek && (
                  <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-400">
                    ({rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(', ')})
                  </span>
                )}
                {rule.recurrenceType === 'interval' && (
                  <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-400">
                    (every {rule.intervalValue ?? '?'} {rule.intervalUnit}
                    {(rule.intervalValue ?? 0) !== 1 ? 's' : ''})
                  </span>
                )}
              </p>

              {rule.windows.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {rule.windows.map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 dark:border-gray-800 dark:bg-neutral-900"
                    >
                      <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      {w.windowStart.substring(0, 5)} – {w.windowEnd.substring(0, 5)}
                      {w.label && (
                        <span className="text-gray-500 dark:text-gray-400">· {w.label}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center gap-3 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span>
          {template.rules.length} rule{template.rules.length !== 1 ? 's' : ''}
        </span>
        <span>·</span>
        <span>
          {totalWindows} window{totalWindows !== 1 ? 's' : ''} total
        </span>
      </div>

      {/* Actions */}
      {canWrite && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-8 flex-1 rounded-lg border px-3 text-xs hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onMaterialize}
            className="h-8 flex-1 rounded-lg border px-3 text-xs hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Regenerate Slots
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-8 rounded-lg border px-3 text-xs text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
