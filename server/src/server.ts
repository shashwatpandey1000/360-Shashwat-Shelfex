import 'dotenv/config';
import app from './app';
import validateEnv from './utils/validateEnv';
import logger from './utils/logger';

validateEnv();

const PORT = process.env.PORT || 4000;
const SHUTDOWN_TIMEOUT = 10_000; // 10 seconds

const server = app.listen(PORT, () => {
  logger.info(`🚀 Shelf360 API listening on port ${PORT}`);
});

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
