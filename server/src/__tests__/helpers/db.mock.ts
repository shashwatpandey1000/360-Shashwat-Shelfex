import { vi } from 'vitest';

/**
 * Creates a chainable Drizzle query builder mock that is also thenable.
 * All builder methods (.from, .where, .orderBy, .limit, .offset, .set, .values,
 * .leftJoin, .onConflictDoUpdate, .onConflictDoNothing)
 * return the same chain so you can call them in any order.
 * Awaiting the chain resolves to `resolvedValue`.
 * .returning() also resolves to `resolvedValue`.
 */
export function makeChain(resolvedValue: unknown[] = []) {
  const chain: any = {};
  for (const m of [
    'from',
    'where',
    'orderBy',
    'limit',
    'offset',
    'set',
    'values',
    'leftJoin',
    'onConflictDoUpdate',
    'onConflictDoNothing',
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.returning = vi.fn().mockResolvedValue(resolvedValue);
  // Make the chain itself awaitable (for select/update used without .returning())
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  chain.catch = (fn: any) => Promise.resolve(resolvedValue).catch(fn);
  return chain;
}

/**
 * Builds a mock for the entire `db` object.
 * Each top-level call (select/insert/update/delete) returns a fresh makeChain().
 */
export function makeMockDb() {
  return {
    select: vi.fn().mockImplementation(() => makeChain([])),
    insert: vi.fn().mockImplementation(() => makeChain([])),
    update: vi.fn().mockImplementation(() => makeChain([])),
    delete: vi.fn().mockImplementation(() => makeChain([])),
    $count: vi.fn().mockResolvedValue(0),
  };
}
