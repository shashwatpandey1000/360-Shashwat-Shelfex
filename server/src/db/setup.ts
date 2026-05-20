import 'dotenv/config';
import { Client, Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const RDS_URL = process.env.DATABASE_URL!;
const SSL = { rejectUnauthorized: false };
const DUMP_S3_KEY = process.env.DUMP_S3_KEY || '';
const S3_BUCKET = process.env.AWS_S3_BUCKET!;

async function setup() {
  const url = new URL(RDS_URL);
  const targetDb = url.pathname.replace('/', '');

  // Step 1: Create the database if it doesn't exist
  url.pathname = '/postgres';
  const adminClient = new Client({ connectionString: url.toString(), ssl: SSL });
  await adminClient.connect();

  const { rows } = await adminClient.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [targetDb],
  );

  if (rows.length === 0) {
    await adminClient.query(`CREATE DATABASE "${targetDb}"`);
    console.log(`Created database: ${targetDb}`);
  } else {
    console.log(`Database already exists: ${targetDb}`);
  }
  await adminClient.end();

  // Step 2: If a dump file is provided, restore it (skips schema migration)
  if (DUMP_S3_KEY) {
    console.log(`Downloading dump from S3: ${DUMP_S3_KEY}`);
    const s3 = new S3Client({ region: process.env.AWS_S3_REGION || 'us-west-2' });
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: DUMP_S3_KEY }));

    const dumpPath = '/tmp/restore.sql';
    const chunks: Buffer[] = [];
    for await (const chunk of Body as AsyncIterable<Buffer>) chunks.push(chunk);
    fs.writeFileSync(dumpPath, Buffer.concat(chunks));
    console.log(`Dump downloaded to ${dumpPath}`);

    // Restore using pg client directly (no psql needed)
    const restoreClient = new Client({ connectionString: RDS_URL, ssl: SSL });
    await restoreClient.connect();
    const sql = fs.readFileSync(dumpPath, 'utf8');
    await restoreClient.query(sql);
    await restoreClient.end();
    console.log('Data restored from dump.');
    fs.unlinkSync(dumpPath);
    return;
  }

  // Step 3: No dump — just run Drizzle migrations
  const pool = new Pool({ connectionString: RDS_URL, ssl: SSL });
  const db = drizzle(pool);
  const migrationsFolder = path.join(__dirname, '..', '..', 'drizzle');
  console.log(`Running migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('Migrations complete.');
  await pool.end();
}

setup().catch((err) => {
  console.error('DB setup failed:', err.message);
  process.exit(1);
});
