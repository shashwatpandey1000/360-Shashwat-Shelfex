import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

async function migrateData() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql);

    console.log(`⏳ Running ${env} migrations from ./drizzle/${env}/...`);

    await migrate(db, { migrationsFolder: `./drizzle/${env}` });

    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateData();
