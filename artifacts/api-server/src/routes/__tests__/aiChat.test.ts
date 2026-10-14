import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// config.ts reads this when it is first imported, so set it before the route loads.
vi.hoisted(() => { process.env.AI_CHAT_IP_LIMIT_PER_MIN = '5'; });

import express from 'express';
import request from 'supertest';
import aiChatRouter from '../aiChat';
import { errorHandler } from '../../middlewares/errorHandler';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', aiChatRouter);
  app.use(errorHandler as any);
  return app;
}

describe('POST /api/ai/menu-chat — rate limits', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ reply: 'ok' }), { status: 200 })));
  });
  beforeEach(() => vi.clearAllMocks());

  it('still limits a client that sends a new session id with every message', async () => {
    const app = makeApp();
    const send = (n: number) =>
      request(app).post('/api/ai/menu-chat').send({ message: 'hello', sessionId: `rotating-${n}` });

    // Each message has its own session, so the per-session limit never triggers.
    for (let i = 0; i < 5; i++) expect((await send(i)).status).toBe(200);

    const blocked = await send(99);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many chat messages/i);
  });
});
