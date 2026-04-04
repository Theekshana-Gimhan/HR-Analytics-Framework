import request from 'supertest';
import express from 'express';
import { createRateLimiter } from '../middleware/rate-limit.middleware';

describe('Rate limiting', () => {
  it('should return 429 when limit exceeded', async () => {
    const app = express();
    app.set('trust proxy', 1);

    // Force a low limit to make the test fast and deterministic.
    app.use(createRateLimiter({ windowMs: 1000, max: 5 }));
    app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));

    const responses: Array<{ status: number; body: Record<string, unknown> }> = [];

    for (let i = 0; i < 7; i += 1) {
      // Sequential requests ensure they all count within the same window.
      const r = await request(app).get('/ping');
      responses.push({ status: r.status, body: r.body });
    }

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 200).length).toBe(5);
    expect(statuses.some((s) => s === 429)).toBe(true);

    const last = responses[responses.length - 1];
    expect(last.status).toBe(429);
    expect(last.body).toHaveProperty('message');
  });
});
