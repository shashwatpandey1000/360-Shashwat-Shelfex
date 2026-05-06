import { DateTime } from 'luxon';
import { createHash } from 'crypto';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  scheduleTemplates,
  recurrenceRules,
  timeWindows,
  scheduleInstances,
  surveyorAssignments,
  stores,
} from '../db/schema';
import logger from '../utils/logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function getMaterializationWindow(): { startDate: string; endDate: string } {
  const today = new Date();
  return {
    startDate: toDateStr(today),
    endDate: toDateStr(addDays(today, 14)),
  };
}

// ─── Recurrence Evaluation ───────────────────────────────────────────────────

interface RuleInput {
  recurrenceType: string;
  daysOfWeek?: number[] | null;
  intervalValue?: number | null;
  intervalUnit?: string | null;
  exceptions?: { skip_dates?: string[] } | null;
}

export function doesDateMatchRule(
  date: DateTime,
  rule: RuleInput,
  effectiveFrom: string,
): boolean {
  const dateStr = date.toFormat('yyyy-MM-dd');

  // Check skip_dates exceptions first
  if (rule.exceptions?.skip_dates?.includes(dateStr)) return false;

  const dow = date.weekday; // Luxon: 1=Mon, 7=Sun

  switch (rule.recurrenceType) {
    case 'daily':
      return true;

    case 'weekdays':
      return dow >= 1 && dow <= 5;

    case 'specific_days':
      return (rule.daysOfWeek ?? []).includes(dow);

    case 'odd_days':
      return date.day % 2 !== 0;

    case 'even_days':
      return date.day % 2 === 0;

    case 'interval': {
      if (!rule.intervalValue || !rule.intervalUnit) return false;
      const from = DateTime.fromISO(effectiveFrom, { zone: 'UTC' });
      const diff =
        rule.intervalUnit === 'week'
          ? Math.floor(date.diff(from, 'weeks').weeks)
          : Math.floor(date.diff(from, 'days').days);
      return diff >= 0 && diff % rule.intervalValue === 0;
    }

    case 'custom_rrule':
      // RFC 5545 RRULE — future feature, skip for V1
      return false;

    default:
      return false;
  }
}

// ─── Idempotency Key ─────────────────────────────────────────────────────────

export function generateIdempotencyKey(
  templateId: string,
  ruleId: string,
  storeId: string,
  dateStr: string,
  windowStart: string,
): string {
  return createHash('sha256')
    .update(`${templateId}:${ruleId}:${storeId}:${dateStr}:${windowStart}`)
    .digest('hex');
}

// ─── Core: materialize for a single store ────────────────────────────────────

export async function materializeForStore(
  template: typeof scheduleTemplates.$inferSelect,
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<{ created: number; skipped: number }> {
  // Load rules for template
  const rules = await db
    .select()
    .from(recurrenceRules)
    .where(eq(recurrenceRules.scheduleTemplateId, template.id));

  if (rules.length === 0) return { created: 0, skipped: 0 };

  const ruleIds = rules.map((r) => r.id);
  const windows = await db
    .select()
    .from(timeWindows)
    .where(inArray(timeWindows.recurrenceRuleId, ruleIds));

  // Persistent surveyor assignments for this store
  const assignments = await db
    .select()
    .from(surveyorAssignments)
    .where(
      and(eq(surveyorAssignments.storeId, storeId), eq(surveyorAssignments.orgId, template.orgId)),
    );

  const timezone = template.timezone;
  const effFrom = DateTime.fromISO(template.effectiveFrom, { zone: 'UTC' });
  const effUntil = template.effectiveUntil
    ? DateTime.fromISO(template.effectiveUntil, { zone: 'UTC' })
    : null;

  const slotsToInsert: (typeof scheduleInstances.$inferInsert)[] = [];

  let current = DateTime.fromISO(startDate, { zone: 'UTC' });
  const end = DateTime.fromISO(endDate, { zone: 'UTC' });

  while (current <= end) {
    // Respect effectiveFrom / effectiveUntil bounds
    if (current < effFrom || (effUntil && current > effUntil)) {
      current = current.plus({ days: 1 });
      continue;
    }

    const dateStr = current.toFormat('yyyy-MM-dd');

    for (const rule of rules) {
      if (
        !doesDateMatchRule(
          current,
          {
            recurrenceType: rule.recurrenceType,
            daysOfWeek: rule.daysOfWeek,
            intervalValue: rule.intervalValue,
            intervalUnit: rule.intervalUnit,
            exceptions: rule.exceptions as { skip_dates?: string[] } | null,
          },
          template.effectiveFrom,
        )
      ) {
        continue;
      }

      const ruleWindows = windows
        .filter((w) => w.recurrenceRuleId === rule.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      for (const win of ruleWindows) {
        // Drizzle returns TIME as 'HH:MM:SS' — normalise to 'HH:MM'
        const startTime = win.windowStart.substring(0, 5);
        const endTime = win.windowEnd.substring(0, 5);

        // DST-aware local → UTC conversion via Luxon
        const localStart = DateTime.fromISO(`${dateStr}T${startTime}:00`, { zone: timezone });
        const localEnd = DateTime.fromISO(`${dateStr}T${endTime}:00`, { zone: timezone });

        if (!localStart.isValid || !localEnd.isValid) continue;

        const utcStart = localStart.toUTC();
        const utcEnd = localEnd.toUTC();

        const idempotencyKey = generateIdempotencyKey(
          template.id,
          rule.id,
          storeId,
          dateStr,
          startTime,
        );

        // Persistent assignment lookup
        const assignment = assignments.find(
          (a) => a.recurrenceRuleId === rule.id && a.timeWindowId === win.id,
        );

        // For TIMESTAMP (no tz) columns we store local wall-clock time as
        // a "fake UTC" Date so Drizzle serialises it correctly.
        const localStartFake = new Date(
          Date.UTC(localStart.year, localStart.month - 1, localStart.day, localStart.hour, localStart.minute, 0),
        );
        const localEndFake = new Date(
          Date.UTC(localEnd.year, localEnd.month - 1, localEnd.day, localEnd.hour, localEnd.minute, 0),
        );

        slotsToInsert.push({
          orgId: template.orgId,
          storeId,
          scheduleTemplateId: template.id,
          recurrenceRuleId: rule.id,
          timeWindowId: win.id,
          scheduledDate: dateStr,
          windowStartUtc: utcStart.toJSDate(),
          windowEndUtc: utcEnd.toJSDate(),
          windowStartLocal: localStartFake,
          windowEndLocal: localEndFake,
          timezone,
          status: 'pending',
          assignedSurveyorId: assignment?.surveyorId ?? null,
          assignedAt: assignment ? new Date() : null,
          idempotencyKey,
          materializedAt: new Date(),
        });
      }
    }

    current = current.plus({ days: 1 });
  }

  if (slotsToInsert.length === 0) return { created: 0, skipped: 0 };

  // Batch upsert — idempotency key prevents duplicates on re-runs
  const CHUNK = 500;
  let created = 0;
  for (let i = 0; i < slotsToInsert.length; i += CHUNK) {
    const chunk = slotsToInsert.slice(i, i + CHUNK);
    const rows = await db
      .insert(scheduleInstances)
      .values(chunk)
      .onConflictDoNothing({ target: scheduleInstances.idempotencyKey })
      .returning({ id: scheduleInstances.id });
    created += rows.length;
  }

  return { created, skipped: slotsToInsert.length - created };
}

// ─── Materialize a single template (handles org-default fan-out) ─────────────

export async function materializeTemplate(
  templateId: string,
  startDate: string,
  endDate: string,
): Promise<{ created: number; skipped: number }> {
  const [template] = await db
    .select()
    .from(scheduleTemplates)
    .where(eq(scheduleTemplates.id, templateId))
    .limit(1);

  if (!template || !template.isActive) return { created: 0, skipped: 0 };

  if (template.storeId) {
    // Per-store override: materialise only for that store
    return materializeForStore(template, template.storeId, startDate, endDate);
  }

  // Org-default: find all stores in org that do NOT have their own active override
  const overrideRows = await db
    .select({ storeId: scheduleTemplates.storeId })
    .from(scheduleTemplates)
    .where(
      and(
        eq(scheduleTemplates.orgId, template.orgId),
        eq(scheduleTemplates.isActive, true),
        sql`${scheduleTemplates.storeId} IS NOT NULL`,
      ),
    );

  const overrideIds = new Set(overrideRows.map((r) => r.storeId!));

  const allStores = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.orgId, template.orgId));

  let total = { created: 0, skipped: 0 };
  for (const store of allStores.filter((s) => !overrideIds.has(s.id))) {
    const r = await materializeForStore(template, store.id, startDate, endDate);
    total.created += r.created;
    total.skipped += r.skipped;
  }

  return total;
}

// ─── Daily cron: materialise all active templates across all orgs ─────────────

export async function materializeAllOrgs(startDate: string, endDate: string): Promise<void> {
  logger.info(`[Materializer] Starting for range ${startDate} → ${endDate}`);

  const allTemplates = await db
    .select()
    .from(scheduleTemplates)
    .where(eq(scheduleTemplates.isActive, true));

  // Build a per-org map of which stores have override templates
  const orgOverrideMap = new Map<string, Set<string>>();
  for (const t of allTemplates) {
    if (t.storeId) {
      if (!orgOverrideMap.has(t.orgId)) orgOverrideMap.set(t.orgId, new Set());
      orgOverrideMap.get(t.orgId)!.add(t.storeId);
    }
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const template of allTemplates) {
    try {
      if (template.storeId) {
        // Per-store override
        const r = await materializeForStore(template, template.storeId, startDate, endDate);
        totalCreated += r.created;
        totalSkipped += r.skipped;
      } else {
        // Org-default: materialise for every store WITHOUT its own override
        const overrideIds = orgOverrideMap.get(template.orgId) ?? new Set();
        const orgStores = await db
          .select({ id: stores.id })
          .from(stores)
          .where(eq(stores.orgId, template.orgId));

        for (const store of orgStores.filter((s) => !overrideIds.has(s.id))) {
          const r = await materializeForStore(template, store.id, startDate, endDate);
          totalCreated += r.created;
          totalSkipped += r.skipped;
        }
      }
    } catch (err) {
      logger.error(`[Materializer] Failed for template ${template.id}: ${err}`);
    }
  }

  logger.info(`[Materializer] Done — created ${totalCreated}, skipped ${totalSkipped}`);
}
