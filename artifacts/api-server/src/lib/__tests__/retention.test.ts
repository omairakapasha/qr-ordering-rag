import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = vi.hoisted(() => ({
  updates: 0,
  set: [] as any[],
  where: [] as any[],
  returned: [] as any[],
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: any[]) => ({ op: 'and', args }),
  or: (...args: any[]) => ({ op: 'or', args }),
  lt: (col: any, val: any) => ({ op: 'lt', col, val }),
  isNotNull: (col: any) => ({ op: 'isNotNull', col }),
}));

vi.mock('@workspace/db', () => ({
  db: {
    update: () => {
      calls.updates++;
      return {
        set: (values: any) => {
          calls.set.push(values);
          return {
            where: (cond: any) => {
              calls.where.push(cond);
              return { returning: async () => calls.returned };
            },
          };
        },
      };
    },
  },
  orders: {
    id: 'orders.id',
    created_at: 'orders.created_at',
    customer_name: 'orders.customer_name',
    customer_phone: 'orders.customer_phone',
  },
}));

vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { anonymizeOldOrders } from '../retention';

describe('anonymizeOldOrders', () => {
  beforeEach(() => {
    calls.updates = 0;
    calls.set.length = 0;
    calls.where.length = 0;
    calls.returned = [];
  });

  it('does nothing when retention is turned off', async () => {
    expect(await anonymizeOldOrders(0)).toBe(0);
    expect(calls.updates).toBe(0);
  });

  it('clears only the name and phone, and nothing else on the order', async () => {
    await anonymizeOldOrders(90);
    expect(calls.set).toEqual([{ customer_name: null, customer_phone: null }]);
  });

  it('targets orders older than the retention period that still hold details', async () => {
    const now = new Date('2026-10-14T12:00:00Z');
    await anonymizeOldOrders(90, now);

    const where = calls.where[0];
    const age = where.args.find((a: any) => a.op === 'lt');
    expect(age.col).toBe('orders.created_at');
    expect(age.val).toEqual(new Date('2026-07-16T12:00:00Z')); // 90 days before `now`

    const hasDetails = where.args.find((a: any) => a.op === 'or');
    expect(hasDetails.args.map((a: any) => a.col)).toEqual(['orders.customer_name', 'orders.customer_phone']);
  });

  it('returns how many orders were cleared', async () => {
    calls.returned = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(await anonymizeOldOrders(30)).toBe(3);
  });
});
