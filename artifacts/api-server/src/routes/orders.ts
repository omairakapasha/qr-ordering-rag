import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db, orders, order_items, tables, menu_items, order_status_history, sessions, staff } from '@workspace/db';
import { eq, inArray, and, gte, ne, sql, desc, gt } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { requireSession } from '../middlewares/requireSession';
import { requireRole } from '../middlewares/requireRole';
import { asyncHandler, AppError } from '../middlewares/errorHandler';
import { broadcast } from '../lib/websocket';
import { sendOrderReadyNotification } from '../lib/push.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { phoneSchema, normalizePhone, isValidPhone } from '../lib/phone.js';
import { v4 as uuidv4 } from 'uuid';

// Keyed by table token so each table gets its own independent limit.
// All customers on the same restaurant WiFi share one IP, so IP-keying would
// block the entire restaurant after just 3 orders.
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const token = req.body?.tableToken as string | undefined;
    return token ? `table:${token}` : (req.ip ?? 'unknown');
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many orders placed. Please wait a minute.' },
});

// Keyed by order ID — each order gets its own cancel window.
const cancelLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `cancel:${req.params.id ?? req.ip}`,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many cancel attempts.' },
});

// Keyed by order ID — each tracking customer polls independently.
const statusPollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const id = req.params.id ?? req.query.phone;
    return id ? `poll:${id}` : (req.ip ?? 'unknown');
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many status requests.' },
});

// Order lookup is keyed by the table's QR token: a lookup needs a real token, so
// the limit follows the table and not the restaurant's shared WiFi address.
const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => `lookup:${String(req.query.tableToken ?? req.ip ?? 'unknown')}`,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many lookups. Please wait a minute.' },
});

// Lookups only cover orders from the last few hours, which is a dine-in visit.
const LOOKUP_WINDOW_MS = 6 * 60 * 60 * 1000;

const router: Router = Router();

// Order ids are UUIDs. A non-UUID path param (e.g. /api/orders/garbage/status)
// would otherwise reach Postgres and throw "invalid input syntax for type uuid"
// → 500. Guard up front and treat malformed ids as a clean 404.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertOrderId(id: string): void {
  if (!UUID_RE.test(id)) throw new AppError(404, 'Order not found');
}

/**
 * trySession — optional session middleware for orders endpoint.
 * Populates req.staff if a valid session cookie is present, but always calls next()
 * regardless of outcome (unlike requireSession which hard-rejects).
 * This enables branching auth logic: customers (no session) supply tableToken;
 * staff (session present) may use tableNumber.
 */
async function trySession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.session as string | undefined;
  if (!token) {
    next();
    return;
  }

  try {
    const result = await db
      .select({
        sessionId: sessions.id,
        staffId: staff.id,
        username: staff.username,
        fullName: staff.full_name,
        role: staff.role,
        active: staff.active,
      })
      .from(sessions)
      .innerJoin(staff, eq(sessions.staff_id, staff.id))
      .where(and(eq(sessions.token, token), gt(sessions.expires_at, new Date())))
      .limit(1);

    const row = result[0];
    if (row?.active) {
      req.staff = {
        staffId: row.staffId,
        username: row.username,
        fullName: row.fullName,
        role: row.role as 'admin' | 'kitchen' | 'waiter',
        sessionId: row.sessionId,
      };
    }
  } catch (_) {
    // Swallow DB errors — failing to load session is treated as unauthenticated.
    // A customer order must not be blocked by transient session-lookup issues.
  }

  next();
}

/** Returns true if the given table still has at least one active order other than excludeOrderId. */
async function tableHasOtherActiveOrders(tableId: number, excludeOrderId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(
      eq(orders.table_id, tableId),
      ne(orders.id, excludeOrderId),
      inArray(orders.status, ['received', 'preparing', 'ready']),
    ))
    .limit(1);
  return !!row;
}

const createOrderSchema = z.object({
  tableToken: z.string().min(1).optional(),
  tableNumber: z.number().int().positive().optional(),
  customerName: z.string().trim().min(2, 'Please enter your name').max(50, 'Name is too long'),
  customerPhone: phoneSchema,
  items: z.array(
    z.object({
      menuItemId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(50),
      specialInstructions: z.string().max(500).optional(),
    })
  ).min(1, 'At least one item required').max(20, 'Too many items in one order'),
  specialInstructions: z.string().max(100).optional(),
}).refine(d => d.tableToken || d.tableNumber, { message: 'tableToken or tableNumber is required' });

const updateOrderStatusSchema = z.object({
  status: z.enum(['received', 'preparing', 'ready', 'served', 'cancelled']),
  notes: z.string().optional(),
});

async function getActiveQueueWithItems() {
  const activeOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      createdAt: orders.created_at,
      updatedAt: orders.updated_at,
      totalAmount: orders.total_amount,
      tableNumber: tables.table_number,
      customerName: orders.customer_name,
      customerPhone: orders.customer_phone,
    })
    .from(orders)
    .leftJoin(tables, eq(orders.table_id, tables.id))
    .where(inArray(orders.status, ['received', 'preparing', 'ready']));

  if (!activeOrders.length) return [];

  const orderIds = activeOrders.map(o => o.id);
  const allItems = await db
    .select({
      orderId: order_items.order_id,
      menuItemId: order_items.menu_item_id,
      name: menu_items.name,
      quantity: order_items.quantity,
      price: order_items.price,
    })
    .from(order_items)
    .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
    .where(inArray(order_items.order_id, orderIds));

  const itemsByOrder = allItems.reduce<Record<string, typeof allItems>>((acc, item) => {
    (acc[item.orderId] ??= []).push(item);
    return acc;
  }, {});

  return activeOrders.map(o => ({ ...o, items: itemsByOrder[o.id] ?? [] }));
}

/**
 * GET /api/orders/lookup?phone=&tableToken=  — find this visit's orders by phone number.
 * Needs the table's QR token as well as the phone number, so knowing a phone
 * number alone doesn't reveal anyone's orders. Must be defined before /:id.
 */
router.get(
  '/lookup',
  lookupLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const tableToken = String(req.query.tableToken ?? '');
    const phone = normalizePhone(String(req.query.phone ?? ''));
    if (!tableToken) throw new AppError(401, 'Table token required');
    if (!isValidPhone(phone)) throw new AppError(400, 'Valid phone number required');

    const [table] = await db
      .select({ id: tables.id })
      .from(tables)
      .where(and(eq(tables.qr_token, tableToken), eq(tables.active, true)))
      .limit(1);
    if (!table) throw new AppError(401, 'Invalid table');

    const since = new Date(Date.now() - LOOKUP_WINDOW_MS);
    const recent = await db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.created_at,
        totalAmount: orders.total_amount,
        tableNumber: tables.table_number,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.table_id, tables.id))
      .where(and(
        eq(orders.customer_phone, phone),
        eq(orders.table_id, table.id),
        gte(orders.created_at, since),
      ))
      .orderBy(desc(orders.created_at))
      .limit(10);

    res.json(recent);
  })
);

/**
 * GET /api/orders/queue  — kitchen alias (must be defined before /:id)
 */
router.get(
  '/queue',
  requireSession,
  requireRole('kitchen'),
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await getActiveQueueWithItems());
  })
);

/**
 * POST /api/orders  — place order (public, requires table token)
 */
router.post(
  '/',
  orderLimiter,
  trySession,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createOrderSchema.parse(req.body);

    // Auth gate: unauthenticated customers must supply a tableToken
    const isStaff = req.staff !== undefined;
    const hasToken = typeof data.tableToken === 'string';

    if (!isStaff && !hasToken) {
      logger.warn({
        msg: 'Unauthenticated order rejected: tableToken missing',
        tableNumber: data.tableNumber ?? null,
        ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      });
      return res.status(401).json({ error: 'Table token required' });
    }

    // Table lookup: token takes precedence (any caller); staff-only path uses table_number
    let tableWhere;
    if (hasToken) {
      // Token always wins — staff or customer
      tableWhere = and(eq(tables.qr_token, data.tableToken!), eq(tables.active, true));
    } else {
      // Staff-only path — number-based lookup (hasToken=false, so schema guarantees tableNumber is present)
      tableWhere = and(eq(tables.table_number, data.tableNumber!), eq(tables.active, true));
    }

    const [tableRecord] = await db.select().from(tables).where(tableWhere).limit(1);

    if (!tableRecord) {
      // 401 for unauthenticated (invalid token), 400 for staff (invalid table number)
      throw new AppError(hasToken && !isStaff ? 401 : 400, 'Invalid table');
    }

    const requestedIds = data.items.map(i => i.menuItemId);
    const fetchedItems = await db
      .select()
      .from(menu_items)
      .where(inArray(menu_items.id, requestedIds));

    const menuItemMap = new Map(fetchedItems.map(m => [m.id, m]));

    let totalAmount = 0;
    let estimatedMinutes = 0;
    const itemsData: Array<{
      menuItemId: number; name: string; quantity: number;
      price: number; specialInstructions?: string;
    }> = [];

    for (const item of data.items) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem || !menuItem.available || menuItem.archived) {
        throw new AppError(400, `Menu item ${item.menuItemId} not available`);
      }
      if (menuItem.stock_quantity !== -1 && menuItem.stock_quantity < item.quantity) {
        throw new AppError(400, `${menuItem.name} has insufficient stock`);
      }

      const price = parseFloat(menuItem.price.toString());
      totalAmount += price * item.quantity;
      // Kitchen prepares all items in parallel, so the wait is the longest single item.
      estimatedMinutes = Math.max(estimatedMinutes, menuItem.prep_time);
      itemsData.push({ menuItemId: item.menuItemId, name: menuItem.name, quantity: item.quantity, price, specialInstructions: item.specialInstructions });
    }

    const orderId = uuidv4();
    await db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: orderId,
        table_id: tableRecord.id,
        total_amount: totalAmount.toString(),
        status: 'received',
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        special_instructions: data.specialInstructions,
      });

      await tx.insert(order_items).values(
        itemsData.map(item => ({
          order_id: orderId,
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          price: item.price.toString(),
          special_instructions: item.specialInstructions,
        }))
      );

      // Atomically decrement stock for finite-stock items; fail if stock ran out since pre-check
      for (const item of itemsData) {
        const menuItem = menuItemMap.get(item.menuItemId)!;
        if (menuItem.stock_quantity === -1) continue;
        const result = await tx
          .update(menu_items)
          .set({ stock_quantity: sql`${menu_items.stock_quantity} - ${item.quantity}` })
          .where(and(
            eq(menu_items.id, item.menuItemId),
            gte(menu_items.stock_quantity, item.quantity),
          ));
        if ((result.rowCount ?? 0) === 0) {
          throw new AppError(400, `${item.name} ran out of stock`);
        }
      }

      // Mark table occupied
      await tx.update(tables).set({ status: 'occupied' }).where(eq(tables.id, tableRecord.id));
    });

    // Broadcast low-stock warnings for any finite-stock item that dropped to ≤ 5 units
    for (const item of itemsData) {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      if (menuItem.stock_quantity === -1) continue;
      const remaining = menuItem.stock_quantity - item.quantity;
      if (remaining <= 5) {
        broadcast({
          type: 'stock:low',
          item: { name: menuItem.name, remaining },
          timestamp: new Date().toISOString(),
        } as any);
      }
    }

    broadcast({
      type: 'order:new',
      order: {
        id: orderId,
        tableNumber: tableRecord.table_number,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        items: itemsData.map(i => ({ menuItemId: i.menuItemId, name: i.name, quantity: i.quantity })),
      },
      timestamp: new Date().toISOString(),
    });

    logger.info(`Order created: ${orderId} for table ${tableRecord.table_number}`);

    res.status(201).json({
      id: orderId,
      totalAmount,
      status: 'received',
      estimatedMinutes,
      trackingUrl: `/orders/${orderId}/track`,
    });
  })
);

/**
 * GET /api/orders  — active queue (waiter/kitchen/admin)
 */
router.get(
  '/',
  requireSession,
  requireRole('waiter'),
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await getActiveQueueWithItems());
  })
);

/**
 * GET /api/orders/:id  — order details (public)
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    assertOrderId(req.params.id);
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.created_at,
        updatedAt: orders.updated_at,
        totalAmount: orders.total_amount,
        tableNumber: tables.table_number,
        customerName: orders.customer_name,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.table_id, tables.id))
      .where(eq(orders.id, req.params.id))
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const items = await db
      .select({
        menuItemId: order_items.menu_item_id,
        name: menu_items.name,
        quantity: order_items.quantity,
        price: order_items.price,
        specialInstructions: order_items.special_instructions,
      })
      .from(order_items)
      .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
      .where(eq(order_items.order_id, req.params.id));

    res.json({ ...order, items });
  })
);

/**
 * GET /api/orders/:id/status  — polling endpoint (public)
 */
router.get(
  '/:id/status',
  statusPollLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    assertOrderId(req.params.id);
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        updatedAt: orders.updated_at,
        createdAt: orders.created_at,
        estimatedReadyTime: orders.estimated_ready_time,
      })
      .from(orders)
      .where(eq(orders.id, req.params.id))
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');
    res.json(order);
  })
);

/**
 * POST /api/orders/:id/cancel  — customer self-cancel (public, 2-min window)
 */
router.post(
  '/:id/cancel',
  cancelLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    assertOrderId(id);

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new AppError(404, 'Order not found');

    if (order.status !== 'received') {
      throw new AppError(409, 'Order cannot be cancelled — it is already being prepared');
    }

    const ageMs = Date.now() - new Date(order.created_at).getTime();
    if (ageMs > 2 * 60 * 1000) {
      throw new AppError(409, 'Cancellation window has passed (2 minutes from order time)');
    }

    const cancelledItems = await db
      .select({ menuItemId: order_items.menu_item_id, quantity: order_items.quantity })
      .from(order_items)
      .where(eq(order_items.order_id, id));

    await db.transaction(async (tx) => {
      // The status check above ran outside this transaction, so repeat it in the
      // UPDATE itself. Only the request that actually moves the order out of
      // 'received' may restore stock; a concurrent cancel (or the kitchen starting
      // the order) matches no row and is rejected, so stock can't be restored twice.
      const cancelled = await tx.update(orders).set({
        status: 'cancelled',
        updated_at: new Date(),
        cancelled_at: new Date(),
        cancellation_reason: 'Customer cancelled',
      }).where(and(eq(orders.id, id), eq(orders.status, 'received')))
        .returning({ id: orders.id });
      if (cancelled.length === 0) {
        throw new AppError(409, 'Order cannot be cancelled — it is already being prepared');
      }

      await tx.insert(order_status_history).values({
        order_id: id,
        from_status: 'received',
        to_status: 'cancelled',
        notes: 'Customer self-cancelled',
      });

      // Restore stock for finite-stock items (stock_quantity = -1 means unlimited, skip those)
      for (const item of cancelledItems) {
        await tx
          .update(menu_items)
          .set({ stock_quantity: sql`${menu_items.stock_quantity} + ${item.quantity}` })
          .where(and(eq(menu_items.id, item.menuItemId), ne(menu_items.stock_quantity, -1)));
      }
    });

    broadcast({ type: 'order:updated', order: { id, status: 'cancelled' }, timestamp: new Date().toISOString() });

    if (order.table_id) {
      const stillBusy = await tableHasOtherActiveOrders(order.table_id, id);
      if (!stillBusy) {
        await db.update(tables).set({ status: 'available' }).where(eq(tables.id, order.table_id));
      }
    }

    writeAuditLog(undefined, 'order:cancelled_by_customer', 'order', id, {
      tableId: order.table_id,
      ageMs,
    }, req).catch(() => {});

    logger.info(`Order self-cancelled by customer: ${id}`);
    res.json({ message: 'Order cancelled' });
  })
);

/**
 * PATCH /api/orders/:id/status  — update status (kitchen/admin)
 */
router.patch(
  '/:id/status',
  requireSession,
  requireRole('waiter'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    assertOrderId(id);
    const { status, notes } = updateOrderStatusSchema.parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new AppError(404, 'Order not found');

    const oldStatus = order.status;

    // When kitchen starts preparing, calculate estimated ready time from item prep times
    let estimatedReadyTime: Date | undefined;
    if (status === 'preparing') {
      const orderMenuItems = await db
        .select({ prepTime: menu_items.prep_time })
        .from(order_items)
        .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
        .where(eq(order_items.order_id, id));
      const maxPrepMin = orderMenuItems.reduce((m, i) => Math.max(m, i.prepTime ?? 10), 0) || 10;
      estimatedReadyTime = new Date(Date.now() + maxPrepMin * 60 * 1000);
    }

    const isCancelling = status === 'cancelled';
    await db.update(orders)
      .set({
        status,
        updated_at: new Date(),
        ...(estimatedReadyTime ? { estimated_ready_time: estimatedReadyTime } : {}),
        ...(isCancelling ? { cancelled_at: new Date(), cancellation_reason: notes || 'Cancelled by staff' } : {}),
      })
      .where(eq(orders.id, id));

    await db.insert(order_status_history).values({
      order_id: id,
      from_status: oldStatus,
      to_status: status,
      changed_by: req.staff?.staffId,
      notes,
    });

    broadcast({
      type: 'order:updated',
      order: { id, status },
      timestamp: new Date().toISOString(),
    });

    if (status === 'ready') {
      const [withTable] = await db
        .select({ tableNumber: tables.table_number })
        .from(orders)
        .leftJoin(tables, eq(orders.table_id, tables.id))
        .where(eq(orders.id, id))
        .limit(1);
      sendOrderReadyNotification(id, withTable?.tableNumber ?? 0).catch(() => {});
    }

    // On cancellation from an active state, restore stock for finite-stock items.
    if (isCancelling && (oldStatus === 'received' || oldStatus === 'preparing' || oldStatus === 'ready')) {
      const cancelledItems = await db
        .select({ menuItemId: order_items.menu_item_id, quantity: order_items.quantity })
        .from(order_items)
        .where(eq(order_items.order_id, id));
      for (const item of cancelledItems) {
        await db
          .update(menu_items)
          .set({ stock_quantity: sql`${menu_items.stock_quantity} + ${item.quantity}` })
          .where(and(eq(menu_items.id, item.menuItemId), ne(menu_items.stock_quantity, -1)));
      }
    }

    // Free the table when an order leaves the active set (served or cancelled).
    if ((status === 'served' || isCancelling) && order.table_id) {
      const stillBusy = await tableHasOtherActiveOrders(order.table_id, id);
      if (!stillBusy) {
        await db.update(tables).set({ status: 'available' }).where(eq(tables.id, order.table_id));
      }
    }

    logger.info(`Order status: ${id} ${oldStatus} → ${status} by ${req.staff?.username}`);

    res.json({ id, status, message: 'Order status updated' });
  })
);

export default router;
