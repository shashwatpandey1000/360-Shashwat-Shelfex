import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

export default defineConfig({
  out: `./drizzle/${env}`,
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
