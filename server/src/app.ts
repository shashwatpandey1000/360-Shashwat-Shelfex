import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './middlewares/error.middleware';
import healthRoutes from './routes/health.route';
import authRoutes from './routes/auth.route';

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiV1 = express.Router();

apiV1.use('/health', healthRoutes);
apiV1.use('/auth', authRoutes);

app.use('/api/v1', apiV1);

app.use(errorMiddleware);

export default app;
