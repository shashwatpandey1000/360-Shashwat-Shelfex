import 'dotenv/config';
import app from './app';
import validateEnv from './utils/validateEnv';
import logger from './utils/logger';
import cron from 'node-cron';
import { materializeAllOrgs, getMaterializationWindow } from './services/schedule.materializer';
import { markMissedSurveys } from './jobs/markMissedSurveys';
import { sendSurveyReminders } from './jobs/sendSurveyReminders';
import { retryPendingApprovalEmails } from './jobs/retryPendingApprovalEmails';

validateEnv();

const PORT = process.env.PORT || 4000;
const SHUTDOWN_TIMEOUT = 10_000; // 10 seconds

const server = app.listen(PORT, () => {
  logger.info(`🚀 Shelf360 API listening on port ${PORT}`);
});

// ─── Daily slot materialisation cron (02:00 UTC) ─────────────────────────────
// Generates schedule instances for the next 14 days across all active templates.
cron.schedule(
  '0 2 * * *',
  async () => {
    logger.info('[Cron] Slot materialisation starting');
    try {
      const { startDate, endDate } = getMaterializationWindow();
      await materializeAllOrgs(startDate, endDate);
      logger.info('[Cron] Slot materialisation complete');
    } catch (err) {
      logger.error(`[Cron] Slot materialisation failed: ${err}`);
    }
  },
  { timezone: 'UTC' },
);

// ─── Mark missed surveys (every 5 min) ───────────────────────────────────────
// Slots whose windowEndUtc < now AND status = pending|in_progress → missed.
// Notifies store manager via email.
cron.schedule(
  '*/5 * * * *',
  async () => {
    try {
      await markMissedSurveys();
    } catch (err) {
      logger.error(`[Cron] markMissedSurveys failed: ${err}`);
    }
  },
  { timezone: 'UTC' },
);

// ─── Send survey reminders (every 5 min) ─────────────────────────────────────
// Emails assigned surveyors 60 min and 10 min before their survey window opens.
cron.schedule(
  '*/5 * * * *',
  async () => {
    try {
      await sendSurveyReminders();
    } catch (err) {
      logger.error(`[Cron] sendSurveyReminders failed: ${err}`);
    }
  },
  { timezone: 'UTC' },
);

// ─── Retry pending approval emails (every 30 min) ────────────────────────────
// Re-sends org approval notification emails to super admins for orgs that
// haven't been notified yet (e.g. due to email delivery failures).
cron.schedule(
  '*/30 * * * *',
  async () => {
    try {
      await retryPendingApprovalEmails();
    } catch (err) {
      logger.error(`[Cron] retryPendingApprovalEmails failed: ${err}`);
    }
  },
  { timezone: 'UTC' },
);

const shutdown = (signal: string) => {
  logger.info(`${signal} received: closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown — connections did not close in time');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});
