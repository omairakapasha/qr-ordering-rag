import { Router, Request, Response as ExpressResponse } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, AppError } from '../middlewares/errorHandler.js';
import { logger } from '../lib/logger.js';
import config from '../config.js';

const router: Router = Router();
const AI_CHAT_URL = `${config.AI_SERVICE_URL}/api/ai/menu-chat`;

// Keyed by sessionId so each conversation gets its own window, not shared across WiFi users.
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    const sessionId = req.body?.sessionId;
    return typeof sessionId === 'string' && sessionId ? `ai:${sessionId}` : (req.ip ?? 'unknown');
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat messages. Please wait a moment.' },
});

// Backstop for the per-session limit above. The session id comes from the client, so a
// script can rotate it to dodge that limit. This one follows the IP address instead. The
// default is generous because everyone on the restaurant's WiFi shares one address.
const aiChatIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.AI_CHAT_IP_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat messages from this network. Please wait a moment.' },
});

router.post(
  '/ai/menu-chat',
  aiChatIpLimiter,
  aiChatLimiter,
  asyncHandler(async (req: Request, res: ExpressResponse) => {
    const { message, sessionId } = req.body;
    if (!message || typeof message !== 'string') {
      throw new AppError(400, 'message is required');
    }

    let upstream: globalThis.Response;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.INTERNAL_API_SECRET) headers['X-Internal-Token'] = config.INTERNAL_API_SECRET;
      upstream = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, sessionId: typeof sessionId === 'string' ? sessionId : '' }),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      logger.warn('AI chat service unreachable');
      throw new AppError(503, 'AI assistant is not available right now');
    }

    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({ detail: 'AI assistant error' }));
      const errorMsg = (body as any).detail ?? 'AI assistant returned an error';
      const status = upstream.status === 429 ? 429 : 502;
      logger.warn('AI chat upstream error', { status: upstream.status });
      throw new AppError(status, errorMsg);
    }

    const data = await upstream.json();
    res.json(data);
  })
);

export default router;
