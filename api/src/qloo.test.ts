import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FixtureQlooClient,
  HttpQlooClient,
  QlooError,
  qlooClientFromEnv,
} from './qloo.js';
import { DOCUMENTED_INSIGHTS_RESPONSE, DOCUMENTED_SEARCH_RESPONSE } from './fixtures.js';

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

  it('resolves taste mentions across music, film, and food', async () => {
    expect((await client.searchEntities('miles'))[0]!.name).toBe('Miles Davis');
    expect((await client.searchEntities('wes anderson'))[0]!.type).toBe('urn:entity:director');
    expect((await client.searchEntities('sushi'))[0]!.type).toBe('urn:entity:cuisine');
  });

  it('returns places with affinity scores in 0..1 and coordinates', async () => {
    const places = await client.getInsights({ entityIds: ['ent-artist-miles'] });
    expect(places.length).toBeGreaterThan(3);
    for (const p of places) {
      expect(p.affinity).toBeGreaterThanOrEqual(0);
      expect(p.affinity).toBeLessThanOrEqual(1);
      expect(typeof p.lat).toBe('number');
      expect(typeof p.lng).toBe('number');
      expect(p.tags.length).toBeGreaterThan(0);
    }
  });
});

describe('HttpQlooClient parsing contract (documented Qloo shapes)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(json: unknown, ok = true, status = 200) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok, status, json: async () => json })),
    );
  }

  it('parses /search results to entities', async () => {
    stubFetch(DOCUMENTED_SEARCH_RESPONSE);
    const client = new HttpQlooClient('k');
    const entities = await client.searchEntities('miles');
    expect(entities).toEqual([
      { id: 'e1', name: 'Miles Davis', type: 'urn:entity:artist' },
      { id: 'e2', name: 'Kind of Blue', type: 'urn:entity:album' },
    ]);
  });

  it('sends the X-Api-Key header and query params', async () => {
    stubFetch({ results: [] });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpQlooClient('secret-key');
    await client.searchEntities('sushi', 3);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/search?');
    expect(url).toContain('query=sushi');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('secret-key');
  });

  it('parses /v2/insights results to places (both location shapes, both tag shapes)', async () => {
    stubFetch(DOCUMENTED_INSIGHTS_RESPONSE);
    const client = new HttpQlooClient('k');
    const places = await client.getInsights({ entityIds: ['e1'] });
    expect(places[0]).toMatchObject({
      id: 'p1',
      name: 'The Jazz Den',
      lat: 19.0596,
      lng: 72.8295,
      affinity: 0.94,
      tags: ['jazz', 'live music'],
      address: 'Bandra West, Mumbai',
    });
    // entity_id + geocode + string-tag fallback shape
    expect(places[1]).toMatchObject({
      id: 'p2',
      name: 'Omakase Room',
      lat: 19.0589,
      lng: 72.8288,
      affinity: 0.91,
      tags: ['sushi', 'omakase'],
    });
  });

  it('sends taste signals as signal.interests.entities with a place filter', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpQlooClient('k');
    await client.getInsights({
      entityIds: ['e1', 'e2'],
      locationQuery: 'Bandra West, Mumbai',
      take: 8,
    });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v2/insights?');
    expect(url).toContain('filter.type=urn%3Aentity%3Aplace');
    expect(url).toContain('signal.interests.entities=e1%2Ce2');
    expect(url).toContain('filter.location.query=Bandra+West%2C+Mumbai');
    expect(url).toContain('take=8');
  });

  it('raises QlooError with status on HTTP failure', async () => {
    stubFetch({ message: 'unauthorized' }, false, 401);
    const client = new HttpQlooClient('bad-key');
    await expect(client.searchEntities('x')).rejects.toMatchObject({
      name: 'QlooError',
      status: 401,
    });
  });
});
