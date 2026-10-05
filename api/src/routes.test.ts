import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { app } from './index.js';
import { savePlan } from './db.js';

describe('POST /api/plan (T-3: intent extraction)', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    process.env['QLOO_MOCK'] = 'true';
    process.env['LLM_MOCK'] = 'true';
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  });

  it('returns extracted intent for a brief (mock LLM)', async () => {
    const res = await fetch(`${base}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'anniversary dinner, jazz and sushi in Bandra' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      intent: { occasion: string; tastes: string[] };
      reply: string;
      sessionId: string;
      plan: { id: string; shareUrl: string; itinerary: { stops: { name: string }[] } } | null;
    };
    expect(body.intent.occasion).toBe('anniversary dinner');
    expect(body.intent.tastes).toContain('Miles Davis');
    // T-5: full loop now returns a persisted plan
    expect(body.reply.length).toBeGreaterThan(10);
    expect(body.plan).not.toBeNull();
    expect(body.plan!.shareUrl).toBe(`/plan/${body.plan!.id}`);
    expect(body.plan!.itinerary.stops.length).toBeGreaterThanOrEqual(2);
  });

  it('400s on a missing message', async () => {
    const res = await fetch(`${base}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/health reports mock modes', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(await res.json()).toEqual({ ok: true, qloo: 'mock', llm: 'mock' });
  });
});

describe('GET /api/plan/:id (shareable plan link)', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    process.env['QLOO_MOCK'] = 'true';
    process.env['LLM_MOCK'] = 'true';
    delete process.env['DATABASE_URL'];
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  });

  it('returns the saved itinerary as JSON', async () => {
    const plan = await savePlan({
      sessionId: 'share-sess',
      brief: { occasion: 'date night' },
      itinerary: {
        stops: [
          {
            name: 'The Jazz Den',
            category: 'bar',
            lat: 19.0596,
            lng: 72.8295,
            affinity: 0.94,
            rationale: 'because you like Miles Davis',
          },
        ],
      },
    });
    const res = await fetch(`${base}/api/plan/${plan.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { plan: { id: string; itinerary: { stops: { name: string }[] } } };
    expect(body.plan.id).toBe(plan.id);
    expect(body.plan.itinerary.stops[0]!.name).toBe('The Jazz Den');
  });

  it('404s JSON for unknown ids', async () => {
    const res = await fetch(`${base}/api/plan/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'plan not found' });
  });
});
