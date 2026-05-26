import 'dotenv/config';
import app from './app';
import validateEnv from './shared/utils/validateEnv';
import logger from './shared/utils/logger';
import cron from 'node-cron';
import { materializeAllOrgs, getMaterializationWindow } from './modules/schedule';

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
