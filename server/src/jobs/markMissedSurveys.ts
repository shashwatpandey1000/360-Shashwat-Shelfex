/**
 * markMissedSurveys — run every 5 minutes
 *
 * Finds schedule slots whose windowEndUtc has passed but are still in
 * 'pending' or 'in_progress' status, marks them 'missed', and emails
 * the store manager.
 */
import { eq, and, lt, inArray } from 'drizzle-orm';
import { db } from '../db';
import { scheduleInstances, stores, users } from '../db/schema';
import { sendSurveyMissedEmail } from '../services/email.service';
import logger from '../utils/logger';

export async function markMissedSurveys(): Promise<void> {
  const now = new Date();

  // Find overdue slots
  const overdue = await db
    .select({
      id: scheduleInstances.id,
      storeId: scheduleInstances.storeId,
      windowStartLocal: scheduleInstances.windowStartLocal,
      windowEndLocal: scheduleInstances.windowEndLocal,
      assignedSurveyorId: scheduleInstances.assignedSurveyorId,
    })
    .from(scheduleInstances)
    .where(
      and(
        lt(scheduleInstances.windowEndUtc, now),
        inArray(scheduleInstances.status, ['pending', 'in_progress']),
      ),
    );

  if (overdue.length === 0) return;

  logger.info(`[markMissedSurveys] Marking ${overdue.length} slot(s) as missed`);

  // Batch update to missed
  const overdueIds = overdue.map((s) => s.id);
  await db
    .update(scheduleInstances)
    .set({ status: 'missed', updatedAt: now })
    .where(inArray(scheduleInstances.id, overdueIds));

  // Send email notifications to store managers
  const dashboardUrl = process.env.CLIENT_URL ?? 'http://localhost:3001';

  for (const slot of overdue) {
    try {
      // Get store + manager details
      const [storeRow] = await db
        .select({ name: stores.name, managerId: stores.managerId })
        .from(stores)
        .where(eq(stores.id, slot.storeId))
        .limit(1);

      if (!storeRow?.managerId) continue;

      const [managerRow] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, storeRow.managerId))
        .limit(1);

      if (!managerRow?.email) continue;

      // Get assigned surveyor name (if any)
      let surveyorName: string | null = null;
      if (slot.assignedSurveyorId) {
        const [surveyorRow] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, slot.assignedSurveyorId))
          .limit(1);
        surveyorName = surveyorRow?.name ?? null;
      }

      const windowStartLocal = new Date(slot.windowStartLocal).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const windowEndLocal = new Date(slot.windowEndLocal).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      sendSurveyMissedEmail(
        managerRow.email,
        managerRow.name ?? managerRow.email,
        storeRow.name,
        windowStartLocal,
        windowEndLocal,
        surveyorName,
        `${dashboardUrl}/dashboard/schedule`,
      );
    } catch (err) {
      logger.error(`[markMissedSurveys] Failed to notify for slot ${slot.id}: ${err}`);
    }
  }

  logger.info(`[markMissedSurveys] Done. Marked ${overdue.length} slot(s) missed.`);
}
