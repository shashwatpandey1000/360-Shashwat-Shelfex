import {
  eq,
  and,
  or,
  desc,
  asc,
  count,
  gte,
  lt,
  lte,
  inArray,
  notInArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { db } from '../../shared/db';
import {
  scheduleTemplates,
  recurrenceRules,
  timeWindows,
  scheduleInstances,
  surveyorAssignments,
  stores,
  users,
} from '../../shared/db/schema';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateRuleInput,
  UpdateRuleInput,
  CreateWindowInput,
  UpdateWindowInput,
  ListSlotsQuery,
  CreateAssignmentInput,
  PreviewSlotsInput,
} from './schedule.types';
import {
  materializeTemplate,
  materializeForStore,
  doesDateMatchRule,
  getMaterializationWindow,
} from './schedule.materializer';
import { DateTime } from 'luxon';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scopeFilter(orgId: string, accessMap: AccessMap) {
  const conditions: ReturnType<typeof eq>[] = [eq(scheduleInstances.orgId, orgId)];

  if (accessMap.scopeType === 'zones' && accessMap.dataScope?.zoneIds?.length) {
    conditions.push(
      sql`${scheduleInstances.storeId} IN (
        SELECT id FROM stores WHERE zone_id = ANY(${accessMap.dataScope.zoneIds}::uuid[])
      )` as ReturnType<typeof eq>,
    );
  } else if (accessMap.scopeType === 'stores' && accessMap.dataScope?.storeIds?.length) {
    conditions.push(
      inArray(scheduleInstances.storeId, accessMap.dataScope.storeIds) as ReturnType<typeof eq>,
    );
  }

  return and(...conditions);
}

async function cancelFuturePendingSlots(templateId: string): Promise<void> {
  await db
    .update(scheduleInstances)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(scheduleInstances.scheduleTemplateId, templateId),
        eq(scheduleInstances.status, 'pending'),
        gte(scheduleInstances.windowStartUtc, new Date()),
      ),
    );
}

async function triggerMaterialize(templateId: string): Promise<void> {
  const { startDate, endDate } = getMaterializationWindow();
  await materializeTemplate(templateId, startDate, endDate);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function createTemplate(
  orgId: string,
  userId: string,
  input: CreateTemplateInput,
) {
  // Enforce one active template per scope (org-default or per-store)
  if (input.storeId) {
    const [existing] = await db
      .select({ id: scheduleTemplates.id })
      .from(scheduleTemplates)
      .where(
        and(
          eq(scheduleTemplates.orgId, orgId),
          eq(scheduleTemplates.storeId, input.storeId),
          eq(scheduleTemplates.isActive, true),
        ),
      )
      .limit(1);
    if (existing) {
      throw Object.assign(new Error('An active template already exists for this store'), {
        statusCode: 409,
      });
    }

    // Auto-cancel pending org-default slots for this store before new override takes effect
    const [orgDefault] = await db
      .select({ id: scheduleTemplates.id })
      .from(scheduleTemplates)
      .where(
        and(
          eq(scheduleTemplates.orgId, orgId),
          isNull(scheduleTemplates.storeId),
          eq(scheduleTemplates.isActive, true),
        ),
      )
      .limit(1);

    if (orgDefault) {
      await db
        .update(scheduleInstances)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(
          and(
            eq(scheduleInstances.orgId, orgId),
            eq(scheduleInstances.storeId, input.storeId),
            eq(scheduleInstances.status, 'pending'),
            gte(scheduleInstances.windowStartUtc, new Date()),
          ),
        );
    }
  } else {
    // Org-default: check none exists
    const [existing] = await db
      .select({ id: scheduleTemplates.id })
      .from(scheduleTemplates)
      .where(
        and(
          eq(scheduleTemplates.orgId, orgId),
          isNull(scheduleTemplates.storeId),
          eq(scheduleTemplates.isActive, true),
        ),
      )
      .limit(1);
    if (existing) {
      throw Object.assign(
        new Error('An active org-default template already exists. Edit the existing one.'),
        { statusCode: 409 },
      );
    }
  }

  const [template] = await db
    .insert(scheduleTemplates)
    .values({
      orgId,
      storeId: input.storeId ?? null,
      name: input.name,
      timezone: input.timezone,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? null,
      isActive: true,
      createdBy: userId,
    })
    .returning();

  return template;
}

export async function listTemplates(orgId: string) {
  const templates = await db
    .select()
    .from(scheduleTemplates)
    .where(eq(scheduleTemplates.orgId, orgId))
    .orderBy(asc(scheduleTemplates.createdAt));

  return templates;
}

export async function getTemplateById(orgId: string, templateId: string) {
  const [template] = await db
    .select()
    .from(scheduleTemplates)
    .where(and(eq(scheduleTemplates.orgId, orgId), eq(scheduleTemplates.id, templateId)))
    .limit(1);

  if (!template) return null;

  const rules = await db
    .select()
    .from(recurrenceRules)
    .where(eq(recurrenceRules.scheduleTemplateId, templateId))
    .orderBy(asc(recurrenceRules.createdAt));

  const ruleIds = rules.map((r) => r.id);
  const windows =
    ruleIds.length > 0
      ? await db
          .select()
          .from(timeWindows)
          .where(inArray(timeWindows.recurrenceRuleId, ruleIds))
          .orderBy(asc(timeWindows.displayOrder))
      : [];

  return {
    ...template,
    rules: rules.map((rule) => ({
      ...rule,
      windows: windows.filter((w) => w.recurrenceRuleId === rule.id),
    })),
  };
}

export async function updateTemplate(
  orgId: string,
  templateId: string,
  input: UpdateTemplateInput,
) {
  const [template] = await db
    .select({ id: scheduleTemplates.id })
    .from(scheduleTemplates)
    .where(and(eq(scheduleTemplates.orgId, orgId), eq(scheduleTemplates.id, templateId)))
    .limit(1);

  if (!template) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.effectiveFrom !== undefined) updateData.effectiveFrom = input.effectiveFrom;
  if (input.effectiveUntil !== undefined) updateData.effectiveUntil = input.effectiveUntil;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(scheduleTemplates)
    .set(updateData)
    .where(eq(scheduleTemplates.id, templateId))
    .returning();

  // Cancel future pending slots and re-materialise
  await cancelFuturePendingSlots(templateId);
  if (updated.isActive) await triggerMaterialize(templateId);

  return updated;
}

export async function deleteTemplate(orgId: string, templateId: string) {
  const [template] = await db
    .select({ id: scheduleTemplates.id })
    .from(scheduleTemplates)
    .where(and(eq(scheduleTemplates.orgId, orgId), eq(scheduleTemplates.id, templateId)))
    .limit(1);

  if (!template) return false;

  await cancelFuturePendingSlots(templateId);

  await db
    .update(scheduleTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(scheduleTemplates.id, templateId));

  return true;
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export async function createRule(orgId: string, templateId: string, input: CreateRuleInput) {
  // Verify template belongs to org
  const [template] = await db
    .select({ id: scheduleTemplates.id, isActive: scheduleTemplates.isActive })
    .from(scheduleTemplates)
    .where(and(eq(scheduleTemplates.orgId, orgId), eq(scheduleTemplates.id, templateId)))
    .limit(1);

  if (!template) return null;

  const [rule] = await db
    .insert(recurrenceRules)
    .values({
      orgId,
      scheduleTemplateId: templateId,
      recurrenceType: input.recurrenceType,
      daysOfWeek: input.daysOfWeek ?? null,
      intervalValue: input.intervalValue ?? null,
      intervalUnit: input.intervalUnit ?? null,
      customRrule: input.customRrule ?? null,
      exceptions: input.exceptions ?? null,
    })
    .returning();

  // Re-materialise if template is active
  if (template.isActive) {
    await cancelFuturePendingSlots(templateId);
    await triggerMaterialize(templateId);
  }

  return rule;
}

export async function updateRule(
  orgId: string,
  templateId: string,
  ruleId: string,
  input: UpdateRuleInput,
) {
  const [rule] = await db
    .select({ id: recurrenceRules.id })
    .from(recurrenceRules)
    .where(
      and(
        eq(recurrenceRules.orgId, orgId),
        eq(recurrenceRules.scheduleTemplateId, templateId),
        eq(recurrenceRules.id, ruleId),
      ),
    )
    .limit(1);

  if (!rule) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.recurrenceType !== undefined) updateData.recurrenceType = input.recurrenceType;
  if (input.daysOfWeek !== undefined) updateData.daysOfWeek = input.daysOfWeek;
  if (input.intervalValue !== undefined) updateData.intervalValue = input.intervalValue;
  if (input.intervalUnit !== undefined) updateData.intervalUnit = input.intervalUnit;
  if (input.customRrule !== undefined) updateData.customRrule = input.customRrule;
  if (input.exceptions !== undefined) updateData.exceptions = input.exceptions;

  const [updated] = await db
    .update(recurrenceRules)
    .set(updateData)
    .where(eq(recurrenceRules.id, ruleId))
    .returning();

  const [template] = await db
    .select({ isActive: scheduleTemplates.isActive })
    .from(scheduleTemplates)
    .where(eq(scheduleTemplates.id, templateId))
    .limit(1);

  if (template?.isActive) {
    await cancelFuturePendingSlots(templateId);
    await triggerMaterialize(templateId);
  }

  return updated;
}

export async function deleteRule(orgId: string, templateId: string, ruleId: string) {
  const [rule] = await db
    .select({ id: recurrenceRules.id })
    .from(recurrenceRules)
    .where(
      and(
        eq(recurrenceRules.orgId, orgId),
        eq(recurrenceRules.scheduleTemplateId, templateId),
        eq(recurrenceRules.id, ruleId),
      ),
    )
    .limit(1);

  if (!rule) return false;

  // Cancel pending slots for this rule specifically
  await db
    .update(scheduleInstances)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(scheduleInstances.recurrenceRuleId, ruleId),
        eq(scheduleInstances.status, 'pending'),
        gte(scheduleInstances.windowStartUtc, new Date()),
      ),
    );

  await db.delete(recurrenceRules).where(eq(recurrenceRules.id, ruleId));

  return true;
}

// ─── Time Windows ─────────────────────────────────────────────────────────────

export async function createWindow(orgId: string, ruleId: string, input: CreateWindowInput) {
  const [rule] = await db
    .select({
      id: recurrenceRules.id,
      templateId: recurrenceRules.scheduleTemplateId,
    })
    .from(recurrenceRules)
    .where(and(eq(recurrenceRules.orgId, orgId), eq(recurrenceRules.id, ruleId)))
    .limit(1);

  if (!rule) return null;

  const [win] = await db
    .insert(timeWindows)
    .values({
      orgId,
      recurrenceRuleId: ruleId,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      label: input.label ?? null,
      displayOrder: input.displayOrder,
    })
    .returning();

  const [template] = await db
    .select({ isActive: scheduleTemplates.isActive })
    .from(scheduleTemplates)
    .where(eq(scheduleTemplates.id, rule.templateId))
    .limit(1);

  if (template?.isActive) {
    await cancelFuturePendingSlots(rule.templateId);
    await triggerMaterialize(rule.templateId);
  }

  return win;
}

export async function updateWindow(
  orgId: string,
  ruleId: string,
  windowId: string,
  input: UpdateWindowInput,
) {
  const [win] = await db
    .select({ id: timeWindows.id, ruleId: timeWindows.recurrenceRuleId })
    .from(timeWindows)
    .where(
      and(
        eq(timeWindows.orgId, orgId),
        eq(timeWindows.recurrenceRuleId, ruleId),
        eq(timeWindows.id, windowId),
      ),
    )
    .limit(1);

  if (!win) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.windowStart !== undefined) updateData.windowStart = input.windowStart;
  if (input.windowEnd !== undefined) updateData.windowEnd = input.windowEnd;
  if (input.label !== undefined) updateData.label = input.label;
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;

  const [updated] = await db
    .update(timeWindows)
    .set(updateData)
    .where(eq(timeWindows.id, windowId))
    .returning();

  const [rule] = await db
    .select({ templateId: recurrenceRules.scheduleTemplateId })
    .from(recurrenceRules)
    .where(eq(recurrenceRules.id, ruleId))
    .limit(1);

  if (rule) {
    const [template] = await db
      .select({ isActive: scheduleTemplates.isActive })
      .from(scheduleTemplates)
      .where(eq(scheduleTemplates.id, rule.templateId))
      .limit(1);

    if (template?.isActive) {
      await cancelFuturePendingSlots(rule.templateId);
      await triggerMaterialize(rule.templateId);
    }
  }

  return updated;
}

export async function deleteWindow(orgId: string, ruleId: string, windowId: string) {
  const [win] = await db
    .select({ id: timeWindows.id })
    .from(timeWindows)
    .where(
      and(
        eq(timeWindows.orgId, orgId),
        eq(timeWindows.recurrenceRuleId, ruleId),
        eq(timeWindows.id, windowId),
      ),
    )
    .limit(1);

  if (!win) return false;

  // Cancel pending slots tied to this specific window
  await db
    .update(scheduleInstances)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(scheduleInstances.timeWindowId, windowId),
        eq(scheduleInstances.status, 'pending'),
        gte(scheduleInstances.windowStartUtc, new Date()),
      ),
    );

  await db.delete(timeWindows).where(eq(timeWindows.id, windowId));

  return true;
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export async function listSlots(orgId: string, accessMap: AccessMap, query: ListSlotsQuery) {
  const { page, perPage, storeId, status, dateFrom, dateTo, sortOrder } = query;
  const offset = (page - 1) * perPage;

  const baseScope = scopeFilter(orgId, accessMap);
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof and>)[] = [baseScope!];

  if (storeId) conditions.push(eq(scheduleInstances.storeId, storeId));
  if (status) conditions.push(eq(scheduleInstances.status, status));
  if (dateFrom) conditions.push(gte(scheduleInstances.scheduledDate, dateFrom));
  if (dateTo) conditions.push(lte(scheduleInstances.scheduledDate, dateTo));

  const where = and(...conditions);
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: scheduleInstances.id,
        orgId: scheduleInstances.orgId,
        storeId: scheduleInstances.storeId,
        storeName: stores.name,
        scheduleTemplateId: scheduleInstances.scheduleTemplateId,
        recurrenceRuleId: scheduleInstances.recurrenceRuleId,
        timeWindowId: scheduleInstances.timeWindowId,
        scheduledDate: scheduleInstances.scheduledDate,
        windowStartUtc: scheduleInstances.windowStartUtc,
        windowEndUtc: scheduleInstances.windowEndUtc,
        windowStartLocal: scheduleInstances.windowStartLocal,
        windowEndLocal: scheduleInstances.windowEndLocal,
        timezone: scheduleInstances.timezone,
        windowLabel: timeWindows.label,
        status: scheduleInstances.status,
        assignedSurveyorId: scheduleInstances.assignedSurveyorId,
        assignedSurveyorName: users.name,
        assignedAt: scheduleInstances.assignedAt,
        startedAt: scheduleInstances.startedAt,
        completedAt: scheduleInstances.completedAt,
        surveyId: scheduleInstances.surveyId,
        materializedAt: scheduleInstances.materializedAt,
      })
      .from(scheduleInstances)
      .leftJoin(stores, eq(scheduleInstances.storeId, stores.id))
      .leftJoin(users, eq(scheduleInstances.assignedSurveyorId, users.id))
      .leftJoin(timeWindows, eq(scheduleInstances.timeWindowId, timeWindows.id))
      .where(where)
      .orderBy(orderFn(scheduleInstances.windowStartUtc))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(scheduleInstances).where(where),
  ]);

  return {
    data,
    total: Number(total),
    page,
    perPage,
    totalPages: Math.ceil(Number(total) / perPage),
  };
}

export async function getSlotById(orgId: string, slotId: string) {
  const [slot] = await db
    .select({
      id: scheduleInstances.id,
      orgId: scheduleInstances.orgId,
      storeId: scheduleInstances.storeId,
      storeName: stores.name,
      scheduleTemplateId: scheduleInstances.scheduleTemplateId,
      recurrenceRuleId: scheduleInstances.recurrenceRuleId,
      timeWindowId: scheduleInstances.timeWindowId,
      scheduledDate: scheduleInstances.scheduledDate,
      windowStartUtc: scheduleInstances.windowStartUtc,
      windowEndUtc: scheduleInstances.windowEndUtc,
      windowStartLocal: scheduleInstances.windowStartLocal,
      windowEndLocal: scheduleInstances.windowEndLocal,
      timezone: scheduleInstances.timezone,
      windowLabel: timeWindows.label,
      status: scheduleInstances.status,
      assignedSurveyorId: scheduleInstances.assignedSurveyorId,
      assignedSurveyorName: users.name,
      assignedAt: scheduleInstances.assignedAt,
      startedAt: scheduleInstances.startedAt,
      completedAt: scheduleInstances.completedAt,
      surveyId: scheduleInstances.surveyId,
    })
    .from(scheduleInstances)
    .leftJoin(stores, eq(scheduleInstances.storeId, stores.id))
    .leftJoin(users, eq(scheduleInstances.assignedSurveyorId, users.id))
    .leftJoin(timeWindows, eq(scheduleInstances.timeWindowId, timeWindows.id))
    .where(and(eq(scheduleInstances.orgId, orgId), eq(scheduleInstances.id, slotId)))
    .limit(1);

  return slot ?? null;
}

export async function assignSurveyor(
  orgId: string,
  slotId: string,
  surveyorId: string,
  force = false,
) {
  const [slot] = await db
    .select()
    .from(scheduleInstances)
    .where(and(eq(scheduleInstances.orgId, orgId), eq(scheduleInstances.id, slotId)))
    .limit(1);

  if (!slot) return { error: 'Slot not found' };
  if (slot.status === 'completed' || slot.status === 'cancelled' || slot.status === 'skipped') {
    return { error: 'Cannot reassign a slot in this status' };
  }

  // Verify surveyor belongs to this org
  const [surveyor] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.id, surveyorId)))
    .limit(1);

  if (!surveyor) return { error: 'Surveyor not found in this organisation' };

  // Conflict check: does this surveyor already have an overlapping slot?
  const conflicts = await db
    .select({ id: scheduleInstances.id })
    .from(scheduleInstances)
    .where(
      and(
        eq(scheduleInstances.assignedSurveyorId, surveyorId),
        sql`${scheduleInstances.id} != ${slotId}`,
        sql`${scheduleInstances.windowStartUtc} < ${slot.windowEndUtc}`,
        sql`${scheduleInstances.windowEndUtc} > ${slot.windowStartUtc}`,
        notInArray(scheduleInstances.status, ['cancelled', 'skipped', 'completed']),
      ),
    )
    .limit(1);

  if (conflicts.length > 0 && !force) {
    return { error: 'Surveyor has a conflicting slot at that time', conflict: true };
  }

  const [updated] = await db
    .update(scheduleInstances)
    .set({
      assignedSurveyorId: surveyorId,
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scheduleInstances.id, slotId))
    .returning();

  return { slot: updated };
}

export async function updateSlotStatus(
  orgId: string,
  slotId: string,
  newStatus: 'cancelled' | 'skipped' | 'excused',
) {
  const [slot] = await db
    .select({ id: scheduleInstances.id, status: scheduleInstances.status })
    .from(scheduleInstances)
    .where(and(eq(scheduleInstances.orgId, orgId), eq(scheduleInstances.id, slotId)))
    .limit(1);

  if (!slot) return null;

  const allowedTransitions: Record<string, string[]> = {
    pending: ['cancelled', 'skipped'],
    in_progress: ['cancelled'],
    missed: ['excused', 'cancelled'],
  };

  if (!allowedTransitions[slot.status]?.includes(newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition slot from '${slot.status}' to '${newStatus}'`),
      { statusCode: 409 },
    );
  }

  const [updated] = await db
    .update(scheduleInstances)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(scheduleInstances.id, slotId))
    .returning();

  return updated;
}

// ─── Persistent Assignments ───────────────────────────────────────────────────

export async function listAssignments(orgId: string, storeId?: string) {
  const conditions = [eq(surveyorAssignments.orgId, orgId)];
  if (storeId) conditions.push(eq(surveyorAssignments.storeId, storeId));

  const rows = await db
    .select({
      id: surveyorAssignments.id,
      storeId: surveyorAssignments.storeId,
      storeName: stores.name,
      recurrenceRuleId: surveyorAssignments.recurrenceRuleId,
      timeWindowId: surveyorAssignments.timeWindowId,
      windowStart: timeWindows.windowStart,
      windowEnd: timeWindows.windowEnd,
      windowLabel: timeWindows.label,
      surveyorId: surveyorAssignments.surveyorId,
      surveyorName: users.name,
      assignedBy: surveyorAssignments.assignedBy,
      createdAt: surveyorAssignments.createdAt,
    })
    .from(surveyorAssignments)
    .leftJoin(stores, eq(surveyorAssignments.storeId, stores.id))
    .leftJoin(users, eq(surveyorAssignments.surveyorId, users.id))
    .leftJoin(timeWindows, eq(surveyorAssignments.timeWindowId, timeWindows.id))
    .where(and(...conditions))
    .orderBy(asc(surveyorAssignments.createdAt));

  return rows;
}

export async function createAssignment(
  orgId: string,
  input: CreateAssignmentInput,
  assignedBy: string,
) {
  // Verify store belongs to org
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(and(eq(stores.orgId, orgId), eq(stores.id, input.storeId)))
    .limit(1);
  if (!store) throw Object.assign(new Error('Store not found'), { statusCode: 404 });

  // Verify surveyor belongs to org
  const [surveyor] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.id, input.surveyorId)))
    .limit(1);
  if (!surveyor) throw Object.assign(new Error('Surveyor not found'), { statusCode: 404 });

  // Upsert (update if already exists for store+rule+window)
  const [assignment] = await db
    .insert(surveyorAssignments)
    .values({
      orgId,
      storeId: input.storeId,
      recurrenceRuleId: input.recurrenceRuleId,
      timeWindowId: input.timeWindowId,
      surveyorId: input.surveyorId,
      assignedBy,
    })
    .onConflictDoUpdate({
      target: [
        surveyorAssignments.storeId,
        surveyorAssignments.recurrenceRuleId,
        surveyorAssignments.timeWindowId,
      ],
      set: {
        surveyorId: input.surveyorId,
        assignedBy,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Apply assignment to existing future pending slots that match
  await db
    .update(scheduleInstances)
    .set({
      assignedSurveyorId: input.surveyorId,
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduleInstances.orgId, orgId),
        eq(scheduleInstances.storeId, input.storeId),
        eq(scheduleInstances.recurrenceRuleId, input.recurrenceRuleId),
        eq(scheduleInstances.timeWindowId, input.timeWindowId),
        eq(scheduleInstances.status, 'pending'),
        gte(scheduleInstances.windowStartUtc, new Date()),
      ),
    );

  return assignment;
}

export async function deleteAssignment(orgId: string, assignmentId: string) {
  const [assignment] = await db
    .select({ id: surveyorAssignments.id })
    .from(surveyorAssignments)
    .where(
      and(eq(surveyorAssignments.orgId, orgId), eq(surveyorAssignments.id, assignmentId)),
    )
    .limit(1);

  if (!assignment) return false;

  await db.delete(surveyorAssignments).where(eq(surveyorAssignments.id, assignmentId));
  return true;
}

// ─── Override Resolution ──────────────────────────────────────────────────────

export async function getStoreEffectiveTemplate(orgId: string, storeId: string) {
  // 1. Check for a per-store active override
  const [override] = await db
    .select()
    .from(scheduleTemplates)
    .where(
      and(
        eq(scheduleTemplates.orgId, orgId),
        eq(scheduleTemplates.storeId, storeId),
        eq(scheduleTemplates.isActive, true),
      ),
    )
    .limit(1);

  if (override) return { ...override, source: 'override' as const };

  // 2. Fall back to org-wide default
  const [orgDefault] = await db
    .select()
    .from(scheduleTemplates)
    .where(
      and(
        eq(scheduleTemplates.orgId, orgId),
        isNull(scheduleTemplates.storeId),
        eq(scheduleTemplates.isActive, true),
      ),
    )
    .limit(1);

  if (orgDefault) return { ...orgDefault, source: 'org_default' as const };

  return null;
}

// ─── Preview (compute slots without saving) ───────────────────────────────────

export async function previewSlots(orgId: string, templateId: string, input: PreviewSlotsInput) {
  const [template] = await db
    .select()
    .from(scheduleTemplates)
    .where(and(eq(scheduleTemplates.orgId, orgId), eq(scheduleTemplates.id, templateId)))
    .limit(1);

  if (!template) return null;

  const rules = await db
    .select()
    .from(recurrenceRules)
    .where(eq(recurrenceRules.scheduleTemplateId, templateId));

  const ruleIds = rules.map((r) => r.id);
  const windows =
    ruleIds.length > 0
      ? await db
          .select()
          .from(timeWindows)
          .where(inArray(timeWindows.recurrenceRuleId, ruleIds))
          .orderBy(asc(timeWindows.displayOrder))
      : [];

  const timezone = template.timezone;
  const effFrom = DateTime.fromISO(template.effectiveFrom, { zone: 'UTC' });
  const effUntil = template.effectiveUntil
    ? DateTime.fromISO(template.effectiveUntil, { zone: 'UTC' })
    : null;

  const preview: Array<{
    date: string;
    windowStart: string;
    windowEnd: string;
    timezone: string;
    label: string | null;
  }> = [];

  let current = DateTime.fromISO(input.dateFrom, { zone: 'UTC' });
  const end = DateTime.fromISO(input.dateTo, { zone: 'UTC' });

  while (current <= end) {
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

      for (const win of windows.filter((w) => w.recurrenceRuleId === rule.id)) {
        const startTime = win.windowStart.substring(0, 5);
        const endTime = win.windowEnd.substring(0, 5);
        const localStart = DateTime.fromISO(`${dateStr}T${startTime}:00`, { zone: timezone });
        if (!localStart.isValid) continue;

        preview.push({
          date: dateStr,
          windowStart: localStart.toUTC().toISO()!,
          windowEnd: DateTime.fromISO(`${dateStr}T${endTime}:00`, { zone: timezone })
            .toUTC()
            .toISO()!,
          timezone,
          label: win.label,
        });
      }
    }

    current = current.plus({ days: 1 });
  }

  return preview;
}

// ─── Manual materialise trigger ───────────────────────────────────────────────

export async function triggerManualMaterialize(orgId: string, templateId: string) {
  const [template] = await db
    .select({ id: scheduleTemplates.id })
    .from(scheduleTemplates)
    .where(and(eq(scheduleTemplates.orgId, orgId), eq(scheduleTemplates.id, templateId)))
    .limit(1);

  if (!template) return null;

  const { startDate, endDate } = getMaterializationWindow();
  return materializeTemplate(templateId, startDate, endDate);
}
