/**
 * sendSurveyReminders — run every 5 minutes
 *
 * Two reminder passes per run:
 *   1. 60-minute reminder: slots whose windowStartUtc is 55–65 min from now
 *   2. 10-minute reminder: slots whose windowStartUtc is 8–12 min from now
 *
 * Sends an email to the assigned surveyor for each matching slot.
 * Uses a ±5 min tolerance band so no slot is missed between 5-min cron ticks.
 */
import { eq, and, between, inArray } from 'drizzle-orm';
import { db } from '../db';
import { scheduleInstances, stores, users } from '../db/schema';
import { sendSurveyorReminderEmail } from '../services/email.service';
import logger from '../utils/logger';

async function sendRemindersForBatch(
  nowMs: number,
  minutesBefore: number,
  toleranceMs: number,
): Promise<void> {
  const targetMs = nowMs + minutesBefore * 60 * 1000;
  const from = new Date(targetMs - toleranceMs);
  const to = new Date(targetMs + toleranceMs);

  const slots = await db
    .select({
      id: scheduleInstances.id,
      storeId: scheduleInstances.storeId,
      windowStartLocal: scheduleInstances.windowStartLocal,
      assignedSurveyorId: scheduleInstances.assignedSurveyorId,
    })
    .from(scheduleInstances)
    .where(
      and(
        between(scheduleInstances.windowStartUtc, from, to),
        inArray(scheduleInstances.status, ['pending']),
      ),
    );

  if (slots.length === 0) return;

  logger.info(
    `[sendSurveyReminders] Sending ${minutesBefore}-min reminders for ${slots.length} slot(s)`,
  );

  for (const slot of slots) {
    if (!slot.assignedSurveyorId) continue;

    try {
      const [surveyorRow] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, slot.assignedSurveyorId))
        .limit(1);

      if (!surveyorRow?.email) continue;

      const [storeRow] = await db
        .select({ name: stores.name })
        .from(stores)
        .where(eq(stores.id, slot.storeId))
        .limit(1);

      const windowStartLocal = new Date(slot.windowStartLocal).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      sendSurveyorReminderEmail(
        surveyorRow.email,
        surveyorRow.name ?? surveyorRow.email,
        storeRow?.name ?? 'your store',
        windowStartLocal,
        minutesBefore,
      );
    } catch (err) {
      logger.error(`[sendSurveyReminders] Failed for slot ${slot.id}: ${err}`);
    }
  }
}

export async function sendSurveyReminders(): Promise<void> {
  const nowMs = Date.now();
  const TOLERANCE_MS = 5 * 60 * 1000; // ±5 minutes

  await Promise.all([
    sendRemindersForBatch(nowMs, 60, TOLERANCE_MS),
    sendRemindersForBatch(nowMs, 10, TOLERANCE_MS),
  ]);
}
