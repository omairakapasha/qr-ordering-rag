import { db, orders } from '@workspace/db';
import { and, lt, or, isNotNull } from 'drizzle-orm';
import { logger } from './logger.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Clears the customer's name and phone number from orders older than the
 * retention period. The orders themselves, with items and totals, stay so
 * sales figures and analytics are unaffected. Returns how many orders changed.
 * A retention period of 0 or less turns this off.
 */
export async function anonymizeOldOrders(retentionDays: number, now: Date = new Date()): Promise<number> {
  if (retentionDays <= 0) return 0;

  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  const changed = await db
    .update(orders)
    .set({ customer_name: null, customer_phone: null })
    .where(and(
      lt(orders.created_at, cutoff),
      or(isNotNull(orders.customer_name), isNotNull(orders.customer_phone)),
    ))
    .returning({ id: orders.id });

  if (changed.length > 0) {
    logger.info(`Cleared customer details from ${changed.length} order(s) older than ${retentionDays} days`);
  }
  return changed.length;
}
