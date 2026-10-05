import { afterEach, describe, expect, it } from 'vitest';
import { __resetDbForTests, getDb, getPlan, savePlan } from './db.js';

describe('plans persistence (pg-mem)', () => {
  afterEach(() => __resetDbForTests());

  it('creates the schema idempotently', async () => {
    await getDb();
    await getDb(); // second call must not throw
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = 'plans'`,
    );
    expect(rows[0]!['table_name']).toBe('plans');
  });

  it('saves and retrieves a plan round-trip', async () => {
    const plan = await savePlan({
      sessionId: 'sess-1',
      brief: { occasion: 'date night', area: 'Bandra' },
      itinerary: {
        stops: [
          {
            name: 'The Jazz Den',
            category: 'bar',
            lat: 19.0596,
            lng: 72.8295,
            affinity: 0.94,
            rationale: 'because you like Miles Davis',
            qlooId: 'plc-jazz-den',
          },
        ],
        summary: 'A jazzy evening in Bandra',
      },
    });
    expect(plan.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(plan.sessionId).toBe('sess-1');

    const fetched = await getPlan(plan.id);
    expect(fetched).toMatchObject({
      id: plan.id,
      sessionId: 'sess-1',
      brief: { occasion: 'date night', area: 'Bandra' },
    });
    expect(fetched!.itinerary.stops[0]!.name).toBe('The Jazz Den');
    expect(fetched!.itinerary.summary).toBe('A jazzy evening in Bandra');
  });

  it('returns null for unknown ids', async () => {
    expect(await getPlan('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
