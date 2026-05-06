/**
 * Schedule Engine smoke test
 *
 * Run with:
 *   npx tsx scripts/test-schedule.ts
 *
 * Requires DATABASE_URL in .env (uses the real DB — runs against dev DB).
 * Does NOT call the HTTP API — tests the service layer directly.
 */

import 'dotenv/config';
import { doesDateMatchRule, generateIdempotencyKey, materializeForStore } from '../src/services/schedule.materializer';
import { DateTime } from 'luxon';

// ─── Colours ──────────────────────────────────────────────────────────────────

const green = (s: string) => `\x1b[32m✓ ${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m✗ ${s}\x1b[0m`;
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function expect(description: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(green(description));
    passed++;
  } else {
    console.log(red(description));
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function expectTrue(description: string, value: boolean) {
  expect(description, value, true);
}

function expectFalse(description: string, value: boolean) {
  expect(description, value, false);
}

// ─── Recurrence rule tests ────────────────────────────────────────────────────

console.log(bold('\n── doesDateMatchRule ──────────────────────────────────────'));

const MON = DateTime.fromISO('2026-05-04', { zone: 'UTC' }); // Monday
const TUE = DateTime.fromISO('2026-05-05', { zone: 'UTC' }); // Tuesday
const SAT = DateTime.fromISO('2026-05-09', { zone: 'UTC' }); // Saturday
const SUN = DateTime.fromISO('2026-05-10', { zone: 'UTC' }); // Sunday
const ODD = DateTime.fromISO('2026-05-03', { zone: 'UTC' }); // 3rd = odd
const EVN = DateTime.fromISO('2026-05-04', { zone: 'UTC' }); // 4th = even

// daily
expectTrue('daily: Monday matches', doesDateMatchRule(MON, { recurrenceType: 'daily' }, '2026-01-01'));
expectTrue('daily: Sunday matches', doesDateMatchRule(SUN, { recurrenceType: 'daily' }, '2026-01-01'));

// weekdays
expectTrue('weekdays: Monday matches',   doesDateMatchRule(MON, { recurrenceType: 'weekdays' }, '2026-01-01'));
expectTrue('weekdays: Tuesday matches',  doesDateMatchRule(TUE, { recurrenceType: 'weekdays' }, '2026-01-01'));
expectFalse('weekdays: Saturday skipped', doesDateMatchRule(SAT, { recurrenceType: 'weekdays' }, '2026-01-01'));
expectFalse('weekdays: Sunday skipped',   doesDateMatchRule(SUN, { recurrenceType: 'weekdays' }, '2026-01-01'));

// specific_days (Mon=1, Wed=3, Fri=5)
const specificRule = { recurrenceType: 'specific_days', daysOfWeek: [1, 3, 5] };
expectTrue('specific_days: Monday matches',    doesDateMatchRule(MON, specificRule, '2026-01-01'));
expectFalse('specific_days: Tuesday skipped', doesDateMatchRule(TUE, specificRule, '2026-01-01'));
expectFalse('specific_days: Saturday skipped', doesDateMatchRule(SAT, specificRule, '2026-01-01'));

// odd / even
expectTrue('odd_days: 3rd matches',   doesDateMatchRule(ODD, { recurrenceType: 'odd_days' }, '2026-01-01'));
expectFalse('odd_days: 4th skipped',  doesDateMatchRule(EVN, { recurrenceType: 'odd_days' }, '2026-01-01'));
expectFalse('even_days: 3rd skipped', doesDateMatchRule(ODD, { recurrenceType: 'even_days' }, '2026-01-01'));
expectTrue('even_days: 4th matches',  doesDateMatchRule(EVN, { recurrenceType: 'even_days' }, '2026-01-01'));

// interval — every 3 days starting 2026-05-01
const ivlRule = { recurrenceType: 'interval', intervalValue: 3, intervalUnit: 'day' };
const ivlFrom = '2026-05-01';
const day0 = DateTime.fromISO('2026-05-01', { zone: 'UTC' }); // +0 → match
const day1 = DateTime.fromISO('2026-05-02', { zone: 'UTC' }); // +1 → no
const day3 = DateTime.fromISO('2026-05-04', { zone: 'UTC' }); // +3 → match
const day6 = DateTime.fromISO('2026-05-07', { zone: 'UTC' }); // +6 → match
expectTrue('interval/3d: day 0 matches', doesDateMatchRule(day0, ivlRule, ivlFrom));
expectFalse('interval/3d: day 1 skipped', doesDateMatchRule(day1, ivlRule, ivlFrom));
expectTrue('interval/3d: day 3 matches', doesDateMatchRule(day3, ivlRule, ivlFrom));
expectTrue('interval/3d: day 6 matches', doesDateMatchRule(day6, ivlRule, ivlFrom));

// skip_dates exception
const withSkip = { recurrenceType: 'daily', exceptions: { skip_dates: ['2026-05-04'] } };
expectFalse('exceptions: skip_date is skipped', doesDateMatchRule(MON, withSkip, '2026-01-01'));
expectTrue('exceptions: other days still match', doesDateMatchRule(TUE, withSkip, '2026-01-01'));

// ─── Timezone / DST tests ─────────────────────────────────────────────────────

console.log(bold('\n── Timezone conversion (IST 08:00 → UTC 02:30) ───────────'));

const dateStr = '2026-05-04';
const tz = 'Asia/Kolkata'; // UTC+5:30, no DST
const localStart = DateTime.fromISO(`${dateStr}T08:00:00`, { zone: tz });
const utcStart = localStart.toUTC();

expect('IST 08:00 → UTC hour is 2', utcStart.hour, 2);
expect('IST 08:00 → UTC minute is 30', utcStart.minute, 30);

// US/Eastern: during summer (EDT = UTC-4), 08:00 EDT = UTC 12:00
const etTz = 'America/New_York';
const etDate = '2026-07-15'; // Summer → EDT
const etLocal = DateTime.fromISO(`${etDate}T08:00:00`, { zone: etTz });
const etUtc = etLocal.toUTC();
expect('EDT 08:00 → UTC hour is 12', etUtc.hour, 12);

// DST transition edge: US/Eastern winter EST = UTC-5
const estDate = '2026-01-15'; // Winter → EST
const estLocal = DateTime.fromISO(`${estDate}T08:00:00`, { zone: etTz });
const estUtc = estLocal.toUTC();
expect('EST 08:00 → UTC hour is 13', estUtc.hour, 13);

// ─── Idempotency key stability ────────────────────────────────────────────────

console.log(bold('\n── Idempotency key ────────────────────────────────────────'));

const key1 = generateIdempotencyKey('tmpl-1', 'rule-1', 'store-1', '2026-05-04', '08:00');
const key2 = generateIdempotencyKey('tmpl-1', 'rule-1', 'store-1', '2026-05-04', '08:00');
const key3 = generateIdempotencyKey('tmpl-1', 'rule-1', 'store-1', '2026-05-05', '08:00');

expect('Same inputs → same key', key1, key2);
expectFalse('Different date → different key', key1 === key3);
expect('Key is 64 chars (SHA-256 hex)', key1.length, 64);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(bold(`\n── Results ────────────────────────────────────────────────`));
console.log(`   ${green(`${passed} passed`)}  ${failed > 0 ? red(`${failed} failed`) : ''}`);

if (failed > 0) process.exit(1);
