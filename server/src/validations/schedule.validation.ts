import { z } from 'zod';

const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

// ─── Template ────────────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  storeId: z.string().uuid('Invalid store ID').optional().nullable(),
  timezone: z.string().refine(isValidTimezone, 'Invalid IANA timezone'),
  effectiveFrom: z.string().regex(datePattern, 'Date must be YYYY-MM-DD'),
  effectiveUntil: z.string().regex(datePattern, 'Date must be YYYY-MM-DD').optional().nullable(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  timezone: z.string().refine(isValidTimezone, 'Invalid IANA timezone').optional(),
  effectiveFrom: z.string().regex(datePattern, 'Date must be YYYY-MM-DD').optional(),
  effectiveUntil: z.string().regex(datePattern, 'Date must be YYYY-MM-DD').optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// ─── Recurrence Rule ─────────────────────────────────────────────────────────

export const RECURRENCE_TYPES = [
  'daily',
  'weekdays',
  'specific_days',
  'odd_days',
  'even_days',
  'interval',
  'custom_rrule',
] as const;

export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

export const createRuleSchema = z
  .object({
    recurrenceType: z.enum(RECURRENCE_TYPES),
    daysOfWeek: z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .optional()
      .nullable(),
    intervalValue: z.number().int().min(1).optional().nullable(),
    intervalUnit: z.enum(['day', 'week']).optional().nullable(),
    customRrule: z.string().max(500).optional().nullable(),
    exceptions: z
      .object({
        skip_dates: z
          .array(z.string().regex(datePattern, 'Skip date must be YYYY-MM-DD'))
          .optional(),
      })
      .optional()
      .nullable(),
  })
  .refine(
    (d) => {
      if (d.recurrenceType === 'specific_days') {
        return d.daysOfWeek != null && d.daysOfWeek.length > 0;
      }
      if (d.recurrenceType === 'interval') {
        return d.intervalValue != null && d.intervalUnit != null;
      }
      return true;
    },
    {
      message:
        'specific_days requires daysOfWeek; interval requires intervalValue and intervalUnit',
    },
  );

export const updateRuleSchema = z
  .object({
    recurrenceType: z.enum(RECURRENCE_TYPES).optional(),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).optional().nullable(),
    intervalValue: z.number().int().min(1).optional().nullable(),
    intervalUnit: z.enum(['day', 'week']).optional().nullable(),
    customRrule: z.string().max(500).optional().nullable(),
    exceptions: z
      .object({
        skip_dates: z.array(z.string().regex(datePattern)).optional(),
      })
      .optional()
      .nullable(),
  });

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

// ─── Time Window ─────────────────────────────────────────────────────────────

export const createWindowSchema = z
  .object({
    windowStart: z.string().regex(timePattern, 'Time must be HH:MM'),
    windowEnd: z.string().regex(timePattern, 'Time must be HH:MM'),
    label: z.string().max(100).optional().nullable(),
    displayOrder: z.number().int().min(0).default(0),
  })
  .refine((d) => d.windowEnd > d.windowStart, {
    message: 'windowEnd must be after windowStart',
    path: ['windowEnd'],
  });

export const updateWindowSchema = z
  .object({
    windowStart: z.string().regex(timePattern, 'Time must be HH:MM').optional(),
    windowEnd: z.string().regex(timePattern, 'Time must be HH:MM').optional(),
    label: z.string().max(100).optional().nullable(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (d) => {
      if (d.windowStart && d.windowEnd) return d.windowEnd > d.windowStart;
      return true;
    },
    { message: 'windowEnd must be after windowStart', path: ['windowEnd'] },
  );

export type CreateWindowInput = z.infer<typeof createWindowSchema>;
export type UpdateWindowInput = z.infer<typeof updateWindowSchema>;

// ─── Slots ────────────────────────────────────────────────────────────────────

export const SLOT_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'missed',
  'cancelled',
  'skipped',
  'excused',
] as const;

export const listSlotsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(1000).default(50),
  storeId: z.string().uuid().optional(),
  status: z.enum(SLOT_STATUSES).optional(),
  dateFrom: z.string().regex(datePattern).optional(),
  dateTo: z.string().regex(datePattern).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const assignSurveyorSchema = z.object({
  surveyorId: z.string().uuid('Invalid surveyor ID'),
  force: z.boolean().optional().default(false),
});

export const updateSlotStatusSchema = z.object({
  status: z.enum(['cancelled', 'skipped', 'excused']),
});

export type ListSlotsQuery = z.infer<typeof listSlotsSchema>;

// ─── Persistent Assignments ───────────────────────────────────────────────────

export const createAssignmentSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  recurrenceRuleId: z.string().uuid('Invalid rule ID'),
  timeWindowId: z.string().uuid('Invalid window ID'),
  surveyorId: z.string().uuid('Invalid surveyor ID'),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

// ─── Preview ──────────────────────────────────────────────────────────────────

export const previewSlotsSchema = z.object({
  dateFrom: z.string().regex(datePattern, 'Date must be YYYY-MM-DD'),
  dateTo: z.string().regex(datePattern, 'Date must be YYYY-MM-DD'),
  storeId: z.string().uuid().optional(),
});

export type PreviewSlotsInput = z.infer<typeof previewSlotsSchema>;
