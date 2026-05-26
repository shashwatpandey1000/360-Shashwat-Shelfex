import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './shared/middlewares/error.middleware';
import { apiLimiter } from './shared/middlewares/rateLimiter.middleware';
import { ApiResponse } from './shared/utils/ApiResponse';
import { healthRouter as healthRoutes } from './modules/health';
import { authRouter as authRoutes } from './modules/auth';
import { lookupsRouter as lookupsRoutes } from './modules/lookups';
import { orgRouter as orgRoutes } from './modules/org';
import { storeRouter as storeRoutes } from './modules/store';
import { zoneRouter as zoneRoutes } from './modules/zone';
import { employeeRouter as employeeRoutes } from './modules/employee';
import { adminRouter as adminRoutes } from './modules/admin';
import { scheduleRouter as scheduleRoutes } from './modules/schedule';
import { tourRouter as tourRoutes } from './modules/tour';
import { surveyRouter as surveyRoutes } from './modules/survey';

const app = express();

// --- Security & parsing middleware ---
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(apiLimiter);

// --- API routes ---
const apiV1 = express.Router();

apiV1.use('/health', healthRoutes);
apiV1.use('/auth', authRoutes);
apiV1.use('/lookups', lookupsRoutes);
apiV1.use('/orgs', orgRoutes);
apiV1.use('/stores', storeRoutes);
apiV1.use('/zones', zoneRoutes);
apiV1.use('/employees', employeeRoutes);
apiV1.use('/admin', adminRoutes);
apiV1.use('/schedules', scheduleRoutes);
apiV1.use('/tours', tourRoutes);
apiV1.use('/surveys', surveyRoutes);

app.use('/api/v1', apiV1);

// --- 404 handler (must be after all routes) ---
app.use((_req, res) => {
  ApiResponse.notFound(res, 'Route not found');
});

// --- Global error handler (must be last) ---
app.use(errorMiddleware);

export default app;
