import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './middlewares/error.middleware';
import { apiLimiter } from './middlewares/rateLimiter.middleware';
import { ApiResponse } from './utils/ApiResponse';
import healthRoutes from './routes/health.route';
import authRoutes from './routes/auth.route';
import lookupsRoutes from './routes/lookups.route';
import orgRoutes from './routes/org.route';
import storeRoutes from './routes/store.route';
import employeeRoutes from './routes/employee.route';
import adminRoutes from './routes/admin.route';

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
apiV1.use('/employees', employeeRoutes);
apiV1.use('/admin', adminRoutes);

app.use('/api/v1', apiV1);

// --- 404 handler (must be after all routes) ---
app.use((_req, res) => {
  ApiResponse.notFound(res, 'Route not found');
});

// --- Global error handler (must be last) ---
app.use(errorMiddleware);

export default app;
