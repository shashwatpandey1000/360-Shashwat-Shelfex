'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  useDeleteRuleMutation,
  useCreateWindowMutation,
  useUpdateWindowMutation,
  useDeleteWindowMutation,
} from '../mutations';
import type { TemplateWithRules, RecurrenceRule } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WindowForm {
  id?: string;
  windowStart: string;
  windowEnd: string;
  label: string;
}

interface RuleForm {
  id?: string;
  recurrenceType: RecurrenceRule['recurrenceType'];
  daysOfWeek: number[];
  intervalValue: string;
  intervalUnit: 'day' | 'week';
  windows: WindowForm[];
  collapsed: boolean;
}

interface TemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TemplateWithRules;
  storeId?: string | null;
  onSaved: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECURRENCE_OPTIONS: { value: RecurrenceRule['recurrenceType']; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'specific_days', label: 'Specific days of week' },
  { value: 'odd_days', label: 'Odd calendar days (1, 3, 5…)' },
  { value: 'even_days', label: 'Even calendar days (2, 4, 6…)' },
  { value: 'interval', label: 'Every N days/weeks' },
];

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Johannesburg',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyRule(): RuleForm {
  return {
    recurrenceType: 'daily',
    daysOfWeek: [],
    intervalValue: '1',
    intervalUnit: 'day',
    windows: [{ windowStart: '09:00', windowEnd: '10:00', label: '' }],
    collapsed: false,
  };
}

function ruleFromApi(rule: TemplateWithRules['rules'][number]): RuleForm {
  return {
    id: rule.id,
    recurrenceType: rule.recurrenceType,
    daysOfWeek: rule.daysOfWeek ?? [],
    intervalValue: String(rule.intervalValue ?? 1),
    intervalUnit: rule.intervalUnit ?? 'day',
    windows: rule.windows.map((w) => ({
      id: w.id,
      windowStart: w.windowStart.substring(0, 5),
      windowEnd: w.windowEnd.substring(0, 5),
      label: w.label ?? '',
    })),
    collapsed: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplateBuilderDialog({
  open,
  onOpenChange,
  template,
  storeId,
  onSaved,
}: TemplateBuilderDialogProps) {
  const isEdit = !!template;

  const createTemplateMutation = useCreateTemplateMutation();
  const updateTemplateMutation = useUpdateTemplateMutation();
  const createRuleMutation = useCreateRuleMutation();
  const updateRuleMutation = useUpdateRuleMutation();
  const deleteRuleMutation = useDeleteRuleMutation();
  const createWindowMutation = useCreateWindowMutation();
  const updateWindowMutation = useUpdateWindowMutation();
  const deleteWindowMutation = useDeleteWindowMutation();

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [customTz, setCustomTz] = useState('');
  const [useCustomTz, setUseCustomTz] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [rules, setRules] = useState<RuleForm[]>([emptyRule()]);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      const knownTz = COMMON_TIMEZONES.includes(template.timezone);
      setUseCustomTz(!knownTz);
      setTimezone(knownTz ? template.timezone : COMMON_TIMEZONES[0]);
      setCustomTz(!knownTz ? template.timezone : '');
      setEffectiveFrom(template.effectiveFrom);
      setEffectiveUntil(template.effectiveUntil ?? '');
      setRules(template.rules.length > 0 ? template.rules.map(ruleFromApi) : [emptyRule()]);
    } else {
      setName('');
      setTimezone('Asia/Kolkata');
      setCustomTz('');
      setUseCustomTz(false);
      setEffectiveFrom(new Date().toISOString().substring(0, 10));
      setEffectiveUntil('');
      setRules([emptyRule()]);
    }
  }, [open, template]);

  // ─── Rule helpers ─────────────────────────────────────────────────────────

  const updateRule = (index: number, patch: Partial<RuleForm>) =>
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const removeRule = (index: number) => setRules((prev) => prev.filter((_, i) => i !== index));

  const toggleDay = (ruleIndex: number, day: number) => {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== ruleIndex) return r;
        const has = r.daysOfWeek.includes(day);
        return {
          ...r,
          daysOfWeek: has ? r.daysOfWeek.filter((d) => d !== day) : [...r.daysOfWeek, day],
        };
      }),
    );
  };

  const addWindow = (ruleIndex: number) =>
    setRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex
          ? {
              ...r,
              windows: [...r.windows, { windowStart: '09:00', windowEnd: '10:00', label: '' }],
            }
          : r,
      ),
    );

  const updateWindow = (ruleIndex: number, wIndex: number, patch: Partial<WindowForm>) =>
    setRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex
          ? { ...r, windows: r.windows.map((w, j) => (j === wIndex ? { ...w, ...patch } : w)) }
          : r,
      ),
    );

  const removeWindow = (ruleIndex: number, wIndex: number) =>
    setRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex ? { ...r, windows: r.windows.filter((_, j) => j !== wIndex) } : r,
      ),
    );

  // ─── Save ─────────────────────────────────────────────────────────────────

  const resolvedTimezone = useCustomTz ? customTz.trim() : timezone;

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Template name is required');
    if (!resolvedTimezone) return toast.error('Timezone is required');
    if (!effectiveFrom) return toast.error('Effective from date is required');
    for (const r of rules) {
      if (r.recurrenceType === 'specific_days' && r.daysOfWeek.length === 0)
        return toast.error('Select at least one day for specific days rule');
      if (r.recurrenceType === 'interval' && (!r.intervalValue || Number(r.intervalValue) < 1))
        return toast.error('Interval value must be ≥ 1');
      if (r.windows.length === 0) return toast.error('Each rule needs at least one time window');
      for (const w of r.windows) {
        if (!w.windowStart || !w.windowEnd)
          return toast.error('All windows need start and end times');
        if (w.windowEnd <= w.windowStart) return toast.error('Window end must be after start');
      }
    }

    setSaving(true);
    try {
      let templateId: string;

      if (isEdit) {
        await updateTemplateMutation.mutateAsync({
          id: template.id,
          data: {
            name: name.trim(),
            timezone: resolvedTimezone,
            effectiveFrom,
            effectiveUntil: effectiveUntil || null,
          },
        });
        templateId = template.id;

        // Sync rules: delete removed, create new, update existing
        const existingRuleIds = new Set(template.rules.map((r) => r.id));
        const keptRuleIds = new Set(rules.filter((r) => r.id).map((r) => r.id!));

        for (const deletedId of existingRuleIds) {
          if (!keptRuleIds.has(deletedId)) {
            await deleteRuleMutation.mutateAsync({ templateId, ruleId: deletedId });
          }
        }

        for (const rule of rules) {
          if (rule.id) {
            await updateRuleMutation.mutateAsync({
              templateId,
              ruleId: rule.id,
              data: {
                recurrenceType: rule.recurrenceType,
                daysOfWeek: rule.recurrenceType === 'specific_days' ? rule.daysOfWeek : null,
                intervalValue: rule.recurrenceType === 'interval' ? Number(rule.intervalValue) : null,
                intervalUnit: rule.recurrenceType === 'interval' ? rule.intervalUnit : null,
              },
            });

            const existingRule = template.rules.find((r) => r.id === rule.id);
            const existingWindowIds = new Set(existingRule?.windows.map((w) => w.id) ?? []);
            const keptWindowIds = new Set(rule.windows.filter((w) => w.id).map((w) => w.id!));

            for (const deletedWinId of existingWindowIds) {
              if (!keptWindowIds.has(deletedWinId)) {
                await deleteWindowMutation.mutateAsync({ templateId, ruleId: rule.id, windowId: deletedWinId });
              }
            }
            for (const win of rule.windows) {
              if (win.id) {
                await updateWindowMutation.mutateAsync({
                  templateId,
                  ruleId: rule.id,
                  windowId: win.id,
                  data: { windowStart: win.windowStart, windowEnd: win.windowEnd, label: win.label || null },
                });
              } else {
                await createWindowMutation.mutateAsync({
                  templateId,
                  ruleId: rule.id,
                  data: { windowStart: win.windowStart, windowEnd: win.windowEnd, label: win.label || null },
                });
              }
            }
          } else {
            const created = await createRuleMutation.mutateAsync({
              templateId,
              data: {
                recurrenceType: rule.recurrenceType,
                daysOfWeek: rule.recurrenceType === 'specific_days' ? rule.daysOfWeek : null,
                intervalValue: rule.recurrenceType === 'interval' ? Number(rule.intervalValue) : null,
                intervalUnit: rule.recurrenceType === 'interval' ? rule.intervalUnit : null,
              },
            });
            for (const win of rule.windows) {
              await createWindowMutation.mutateAsync({
                templateId,
                ruleId: created.data.id,
                data: { windowStart: win.windowStart, windowEnd: win.windowEnd, label: win.label || null },
              });
            }
          }
        }
      } else {
        const res = await createTemplateMutation.mutateAsync({
          name: name.trim(),
          storeId: storeId ?? null,
          timezone: resolvedTimezone,
          effectiveFrom,
          effectiveUntil: effectiveUntil || null,
        });
        templateId = res.data.id;

        for (const rule of rules) {
          const created = await createRuleMutation.mutateAsync({
            templateId,
            data: {
              recurrenceType: rule.recurrenceType,
              daysOfWeek: rule.recurrenceType === 'specific_days' ? rule.daysOfWeek : null,
              intervalValue: rule.recurrenceType === 'interval' ? Number(rule.intervalValue) : null,
              intervalUnit: rule.recurrenceType === 'interval' ? rule.intervalUnit : null,
            },
          });
          for (const win of rule.windows) {
            await createWindowMutation.mutateAsync({
              templateId,
              ruleId: created.data.id,
              data: { windowStart: win.windowStart, windowEnd: win.windowEnd, label: win.label || null },
            });
          }
        }
      }

      toast.success(isEdit ? 'Template updated' : 'Template created');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface max-h-[90vh] overflow-y-auto rounded-lg border border-gray-200 p-0 sm:max-w-2xl dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="border-b px-6 py-4 text-base font-semibold uppercase">
            {isEdit ? 'Edit Template' : 'New Schedule Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          {/* Template details */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Template Details
            </h3>

            <div className="space-y-2">
              <Label htmlFor="tmpl-name">Name</Label>
              <Input
                id="tmpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Weekly"
              />
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              {!useCustomTz ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={timezone}
                    onValueChange={(v) => {
                      if (typeof v === 'string') setTimezone(v);
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    className="shrink-0 text-[13px] text-gray-500 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    onClick={() => setUseCustomTz(true)}
                  >
                    Other…
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={customTz}
                    onChange={(e) => setCustomTz(e.target.value)}
                    placeholder="e.g. America/Toronto"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    className="shrink-0 text-[13px] text-gray-500 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    onClick={() => setUseCustomTz(false)}
                  >
                    Pick…
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tmpl-from">Effective From</Label>
                <Input
                  id="tmpl-from"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-until">
                  Effective Until{' '}
                  <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
                </Label>
                <Input
                  id="tmpl-until"
                  type="date"
                  value={effectiveUntil}
                  onChange={(e) => setEffectiveUntil(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Rules */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Recurrence Rules
              </h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-md border px-3 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
                onClick={() => setRules((prev) => [...prev, emptyRule()])}
              >
                <PlusCircle className="mr-1 h-3.5 w-3.5" />
                Add Rule
              </Button>
            </div>

            {rules.map((rule, rIndex) => (
              <RuleBlock
                key={rIndex}
                rule={rule}
                rIndex={rIndex}
                canRemove={rules.length > 1}
                onUpdate={(patch) => updateRule(rIndex, patch)}
                onRemove={() => removeRule(rIndex)}
                onToggleDay={(day) => toggleDay(rIndex, day)}
                onAddWindow={() => addWindow(rIndex)}
                onUpdateWindow={(wIndex, patch) => updateWindow(rIndex, wIndex, patch)}
                onRemoveWindow={(wIndex) => removeWindow(rIndex, wIndex)}
              />
            ))}
          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="ghost"
            className="rounded-md border px-4 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button className="rounded-md px-4 text-[13px]" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── RuleBlock ────────────────────────────────────────────────────────────────

interface RuleBlockProps {
  rule: RuleForm;
  rIndex: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<RuleForm>) => void;
  onRemove: () => void;
  onToggleDay: (day: number) => void;
  onAddWindow: () => void;
  onUpdateWindow: (wIndex: number, patch: Partial<WindowForm>) => void;
  onRemoveWindow: (wIndex: number) => void;
}

function RuleBlock({
  rule,
  rIndex,
  canRemove,
  onUpdate,
  onRemove,
  onToggleDay,
  onAddWindow,
  onUpdateWindow,
  onRemoveWindow,
}: RuleBlockProps) {
  return (
    <div className="bg-surface-muted/20 space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800 dark:bg-neutral-900/40">
      {/* Rule header */}
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
          Rule {rIndex + 1}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onUpdate({ collapsed: !rule.collapsed })}
          className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          {rule.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {!rule.collapsed && (
        <>
          {/* Recurrence type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Recurrence</Label>
            <Select
              value={rule.recurrenceType}
              onValueChange={(v) => {
                if (typeof v === 'string')
                  onUpdate({ recurrenceType: v as RuleForm['recurrenceType'] });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional: specific days */}
          {rule.recurrenceType === 'specific_days' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => (
                  <label key={d.value} className="flex cursor-pointer items-center gap-1.5">
                    <Checkbox
                      checked={rule.daysOfWeek.includes(d.value)}
                      onCheckedChange={() => onToggleDay(d.value)}
                    />
                    <span className="text-xs">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Conditional: interval */}
          {rule.recurrenceType === 'interval' && (
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Every</Label>
                <Input
                  type="number"
                  min={1}
                  value={rule.intervalValue}
                  onChange={(e) => onUpdate({ intervalValue: e.target.value })}
                  className="h-8"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Select
                  value={rule.intervalUnit}
                  onValueChange={(v) => {
                    if (v === 'day' || v === 'week') onUpdate({ intervalUnit: v });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day(s)</SelectItem>
                    <SelectItem value="week">Week(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Time windows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Time Windows</Label>
              <button
                type="button"
                onClick={onAddWindow}
                className="text-brand-purple flex items-center gap-1 text-xs hover:underline"
              >
                <PlusCircle className="h-3 w-3" />
                Add
              </button>
            </div>

            {rule.windows.map((win, wIndex) => (
              <div key={wIndex} className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1">
                  <Input
                    type="time"
                    value={win.windowStart}
                    onChange={(e) => onUpdateWindow(wIndex, { windowStart: e.target.value })}
                    className="h-8 flex-1 text-xs"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">–</span>
                  <Input
                    type="time"
                    value={win.windowEnd}
                    onChange={(e) => onUpdateWindow(wIndex, { windowEnd: e.target.value })}
                    className="h-8 flex-1 text-xs"
                  />
                </div>
                <Input
                  value={win.label}
                  onChange={(e) => onUpdateWindow(wIndex, { label: e.target.value })}
                  placeholder="Label (optional)"
                  className="h-8 w-32 text-xs"
                />
                {rule.windows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveWindow(wIndex)}
                    className="shrink-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
