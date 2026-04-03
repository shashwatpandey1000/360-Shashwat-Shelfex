import 'dotenv/config';
import app from './app';
import validateEnv from './utils/validateEnv';
import logger from './utils/logger';

validateEnv();

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Shelf360 API listening on port ${PORT}`);
});

const shutdown = () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
