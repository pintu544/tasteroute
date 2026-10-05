import { describe, expect, it } from 'vitest';
import {
  FixtureQlooClient,
  HttpQlooClient,
  qlooClientFromEnv,
} from './qloo.js';

describe('qlooClientFromEnv', () => {
  it('returns the fixture client when QLOO_MOCK=true (no key needed)', () => {
    const client = qlooClientFromEnv({ QLOO_MOCK: 'true' } as NodeJS.ProcessEnv);
    expect(client.mode).toBe('mock');
    expect(client).toBeInstanceOf(FixtureQlooClient);
  });

  it('throws loudly when no key and no mock flag', () => {
    expect(() => qlooClientFromEnv({} as NodeJS.ProcessEnv)).toThrow(/QLOO_API_KEY/);
  });

  it('returns the live client when a key is present', () => {
    const client = qlooClientFromEnv({ QLOO_API_KEY: 'test-key' } as NodeJS.ProcessEnv);
    expect(client.mode).toBe('live');
    expect(client).toBeInstanceOf(HttpQlooClient);
  });
});

describe('FixtureQlooClient', () => {
  const client = new FixtureQlooClient();

  it('resolves taste mentions to entities', async () => {
    const entities = await client.searchEntities('miles');
    expect(entities.length).toBeGreaterThan(0);
    expect(entities[0]!.name).toBe('Miles Davis');
  });

  it('returns places with affinity scores in 0..1 and coordinates', async () => {
    const places = await client.getInsights({ entityIds: ['ent-jazz-001'] });
    expect(places.length).toBeGreaterThan(0);
    for (const p of places) {
      expect(p.affinity).toBeGreaterThanOrEqual(0);
      expect(p.affinity).toBeLessThanOrEqual(1);
      expect(typeof p.lat).toBe('number');
      expect(typeof p.lng).toBe('number');
    }
  });
});
