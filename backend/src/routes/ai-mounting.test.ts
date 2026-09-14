import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { config } from '../config/index.js';
import { enforceRateLimitsForTest, resetRateLimits } from '../middleware/rate-limit.js';

/**
 * Photo extract and Ask AI share the /ai prefix. Mounted separately, the shared
 * guards re-run for every router that declines the path, and each pass spends
 * another slot from the same bucket. These cases pin the cost at one slot per
 * request.
 *
 * Only the guards are exercised, and they run before any controller, so what
 * the handler does with the request (or whether a database is reachable) does
 * not matter here.
 */
describe('/ai mounting spends one rate-limit slot per request', () => {
  let base = '';
  let server: Server;

  const AI_MAX = 20;

  before(async () => {
    server = createApp().listen(0, '127.0.0.1') as Server;
    await new Promise<void>((resolve, reject) => {
      server.once('listening', () => resolve());
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind a port.');
    }
    base = `http://127.0.0.1:${address.port}/api`;
    enforceRateLimitsForTest(true);
  });

  after(async () => {
    enforceRateLimitsForTest(false);
    resetRateLimits();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  /** Signed here rather than fetched: authenticate only verifies the signature. */
  const tokenFor = (userId: string) =>
    jwt.sign({ userId, email: `${userId}@example.com` }, config.jwt.secret);

  async function allowedBefore429(path: string, method: string, userId: string): Promise<number> {
    resetRateLimits();
    const token = tokenFor(userId);

    for (let sent = 1; sent <= AI_MAX + 5; sent += 1) {
      const response = await fetch(base + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) : undefined,
      });

      if (response.status === 429) {
        return sent - 1;
      }
    }

    return AI_MAX + 5;
  }

  it('lets the AI bucket through exactly max times on every /ai route', async () => {
    assert.equal(await allowedBefore429('/ai/status', 'GET', 'rl-status'), AI_MAX);
    assert.equal(await allowedBefore429('/ai/chat', 'POST', 'rl-chat'), AI_MAX);
  });
});
