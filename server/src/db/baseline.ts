import 'dotenv/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';

const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const migrationsFolder = path.resolve(process.cwd(), `./drizzle/${env}`);

// Migrations already applied to the DB (via db:push) that need to be baselined.
// 'when' values come from drizzle/dev/meta/_journal.json
const APPLIED_MIGRATIONS = [
  { tag: '0000_pink_stellaris', when: 1775317504645 },
  { tag: '0001_last_the_enforcers', when: 1776673536208 },
  { tag: '0002_exotic_radioactive_man', when: 1779263574092 },
];

async function baseline() {
  const sql = neon(process.env.DATABASE_URL!);

  try {
    // Drizzle uses the 'drizzle' schema for its migrations table
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `;
    console.log('✅ drizzle.__drizzle_migrations table ready');

    // Drop any records inserted into the wrong (public) schema by a previous run
    await sql`DROP TABLE IF EXISTS "__drizzle_migrations"`;

    for (const { tag, when } of APPLIED_MIGRATIONS) {
      const existing = await sql`
        SELECT id FROM drizzle.__drizzle_migrations WHERE created_at = ${when}
      `;

      if (existing.length > 0) {
        console.log(`⏭️  ${tag} already baselined, skipping`);
        continue;
      }

      const filePath = path.join(migrationsFolder, `${tag}.sql`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${hash}, ${when})
      `;
      console.log(`✅ Baselined: ${tag}`);
    }

    console.log('\n✅ Baseline complete. Run npm run db:migrate to apply new migrations.');
  } catch (err) {
    console.error('❌ Baseline failed:', err);
    process.exit(1);
  }
}

baseline();
