import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { app } from './index.js';

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
    const body = (await res.json()) as { intent: { occasion: string; tastes: string[] } };
    expect(body.intent.occasion).toBe('anniversary dinner');
    expect(body.intent.tastes).toContain('Miles Davis');
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
