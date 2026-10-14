import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

import { logger } from './lib/logger';
import config from './config';
import { KitchenWebSocketManager, setWsManager } from './lib/websocket';
import { db, pool as dbPool, sessions, staff } from '@workspace/db';
import { eq, and, gt, lt, sql } from 'drizzle-orm';
import { seedIfEmpty } from './seed';

import compression from 'compression';
import webpush from 'web-push';
import { runMigrations } from './lib/migrate.js';
import { anonymizeOldOrders } from './lib/retention.js';
import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import ordersRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import tablesRoutes from './routes/tables';
import kitchenRoutes from './routes/kitchen';
import aiChatRoutes from './routes/aiChat';
import pushRoutes from './routes/push';

import { customerPage } from './pages/customer';
import { kitchenPage } from './pages/kitchen';
import { adminPage } from './pages/admin';
import { trackPage } from './pages/track';
import { waiterPage } from './pages/waiter';
import { receiptPage } from './pages/receipt';

import { errorHandler } from './middlewares/errorHandler';
import { csrfCheck } from './middlewares/csrfCheck';

// Startup validation
if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required');

// Init Web Push VAPID — optional; push notifications silently disabled if keys absent
if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY);
}
if (!config.SESSION_SECRET || config.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters long');
}

const app = express();

// Behind a reverse proxy every request otherwise appears to come from the proxy's
// address, which breaks per-IP rate limits and the IPs written to the audit log.
if (config.TRUST_PROXY) {
  app.set(
    'trust proxy',
    /^\d+$/.test(config.TRUST_PROXY) ? parseInt(config.TRUST_PROXY, 10) : config.TRUST_PROXY === 'true' ? true : config.TRUST_PROXY,
  );
}
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });
wss.on('error', (err) => logger.error('WebSocketServer error', { err }));
const kitchenWs = new KitchenWebSocketManager(wss);
setWsManager(kitchenWs);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      upgradeInsecureRequests: null,
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      // Helmet sets script-src-attr to 'none' by default, which blocks inline
      // event handlers (onclick, onchange, onkeydown, etc.) used across all
      // SSR pages. Allow them here; migrate to addEventListener long-term.
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://cdn.jsdelivr.net'],
    },
  },
}));

// Core middleware
app.use(compression());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(csrfCheck);

// Static: menu item images — path anchored to this file, not CWD
const imagesPath = path.resolve(fileURLToPath(import.meta.url), '../../../../Menu_Item_Images');
app.use('/images', express.static(imagesPath, { maxAge: '30d', immutable: true }));

// Health check — verifies DB connectivity and AI service reachability
app.get('/health', async (_req, res) => {
  const result: Record<string, string> = { timestamp: new Date().toISOString() };

  try {
    await db.execute(sql`SELECT 1`);
    result.db = 'ok';
  } catch {
    result.db = 'error';
  }

  try {
    const ai = await fetch(`${config.AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    result.ai = ai.ok ? 'ok' : 'error';
  } catch {
    result.ai = 'unavailable';
  }

  result.status = result.db === 'ok' ? 'ok' : 'degraded';
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

// Service worker for Web Push — must be at root scope
app.get('/sw.js', (_req, res) => {
  res.type('application/javascript').send(
    `self.addEventListener('push',e=>{const d=e.data?.json()??{};e.waitUntil(self.registration.showNotification(d.title??'Order Update',{body:d.body??'',icon:d.icon??'/favicon.ico'}));});self.addEventListener('notificationclick',e=>{e.notification.close();});`
  );
});

// HTML pages
app.get('/', (_req, res) => res.type('html').send(customerPage()));
app.get('/kitchen', (_req, res) => res.type('html').send(kitchenPage()));
app.get('/admin', (_req, res) => res.type('html').send(adminPage()));
app.get('/waiter', (_req, res) => res.type('html').send(waiterPage()));
app.get('/orders/:id/track', (req, res) => res.type('html').send(trackPage(req.params.id, config.VAPID_PUBLIC_KEY)));
app.get('/orders/:id/receipt', (req, res) => res.type('html').send(receiptPage(req.params.id)));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api', kitchenRoutes);   // GET /api/stats
app.use('/api', adminRoutes);     // GET/POST/PATCH /api/staff, /api/audit-log, /api/admin/orders, /api/admin/menu
app.use('/api', tablesRoutes);    // GET/POST /api/tables
app.use('/api', aiChatRoutes);   // POST /api/ai/menu-chat
app.use('/api/push', pushRoutes); // POST /api/push/subscribe

// Error handling (must be last)
app.use(errorHandler);
// WebSocket — only accept authenticated kitchen/admin connections on /api/ws/kitchen
httpServer.on('upgrade', async (req, socket, head) => {
  if (req.url !== '/api/ws/kitchen') {
    socket.destroy();
    return;
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie ?? '').split(';').map(p => { const i = p.indexOf('='); return i === -1 ? [p.trim(), ''] : [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())]; })
  );
  const token = cookies['session'];

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  try {
    const [row] = await db
      .select({ role: staff.role, active: staff.active })
      .from(sessions)
      .innerJoin(staff, eq(sessions.staff_id, staff.id))
      .where(and(eq(sessions.token, token), gt(sessions.expires_at, new Date())))
      .limit(1);

    const roleLevel = row?.role === 'admin' ? 3 : row?.role === 'kitchen' ? 2 : 0;
    if (!row || !row.active || roleLevel < 2) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
  } catch (err) {
    logger.error('WebSocket auth DB error', { err });
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

async function pruneExpiredSessions() {
  try {
    const result = await db.delete(sessions).where(lt(sessions.expires_at, new Date()));
    const count = result.rowCount ?? 0;
    if (count > 0) logger.info(`Pruned ${count} expired session(s)`);
  } catch (err) {
    logger.error('Session prune failed', { err });
  }
}

async function start() {
  // Migrations must run before anything else touches the DB schema
  await runMigrations();

  try {
    await seedIfEmpty();
  } catch (err) {
    logger.error('Database seed failed — is the DB running?', { err });
  }

  // Prune expired sessions on startup and every hour thereafter
  await pruneExpiredSessions();
  setInterval(pruneExpiredSessions, 60 * 60 * 1000);

  // Clear customer names and phone numbers from old orders, at startup and once a day.
  if (config.PII_RETENTION_DAYS > 0) {
    const clearOldCustomerDetails = () =>
      anonymizeOldOrders(config.PII_RETENTION_DAYS).catch((err) => {
        logger.error('Customer data retention job failed', { err });
      });
    await clearOldCustomerDetails();
    setInterval(clearOldCustomerDetails, 24 * 60 * 60 * 1000);
  }

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${config.PORT} is already in use`);
    } else {
      logger.error('HTTP server error', { err });
    }
    process.exit(1);
  });

  httpServer.listen(config.PORT, config.HOST, () => {
    logger.info(`Server: http://${config.HOST}:${config.PORT}`);
    logger.info(`Env: ${config.NODE_ENV}`);
  });
}

function shutdown() {
  httpServer.close(async () => {
    logger.info('Server closed');
    try { await dbPool.end(); } catch { /* ignore */ }
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

start().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});

export { app, httpServer };
