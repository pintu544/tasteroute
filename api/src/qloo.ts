/**
 * Qloo taste-graph client contract.
 *
 * Two implementations behind one interface:
 *  - HttpQlooClient    — real API (X-Api-Key against https://hackathon.api.qloo.com)
 *  - FixtureQlooClient — canned entities/insights so the whole app builds before the key arrives
 *
 * Selection: `qlooClientFromEnv()` — QLOO_MOCK=true forces fixtures; otherwise
 * QLOO_API_KEY is required and boot fails loudly without it. No silent mock in production.
 */

export interface QlooEntity {
  id: string;
  name: string;
  /** Qloo entity type URN, e.g. 'urn:entity:artist' */
  type: string;
}

export interface QlooPlace {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  /** Qloo affinity score, 0..1 */
  affinity: number;
  tags: string[];
  address?: string;
}

export interface InsightsOptions {
  entityIds: string[];
  /** Defaults to 'urn:entity:place' */
  filterType?: string;
  locationQuery?: string;
  take?: number;
}

export interface QlooClient {
  readonly mode: 'live' | 'mock';
  searchEntities(query: string, limit?: number): Promise<QlooEntity[]>;
  getInsights(opts: InsightsOptions): Promise<QlooPlace[]>;
}

export class QlooError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'QlooError';
  }
}

function qlooBase(): string {
  return process.env.QLOO_BASE_URL ?? 'https://hackathon.api.qloo.com';
}

/** Real client. All Qloo response parsing lives here — the one file that absorbs API drift. */
export class HttpQlooClient implements QlooClient {
  readonly mode = 'live' as const;

  constructor(private apiKey: string) {
    if (!apiKey) throw new QlooError('HttpQlooClient requires an API key');
  }

  private headers(): Record<string, string> {
    return { 'X-Api-Key': this.apiKey, accept: 'application/json' };
  }

  async searchEntities(query: string, limit = 5): Promise<QlooEntity[]> {
    const params = new URLSearchParams({ query, limit: String(limit) });
    const res = await fetch(`${qlooBase()}/search?${params}`, { headers: this.headers() });
    if (!res.ok) throw new QlooError(`Qloo search failed: HTTP ${res.status}`, res.status);
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
    return (data.results ?? []).map((r) => ({
      id: String(r['id'] ?? r['entity_id'] ?? ''),
      name: String(r['name'] ?? ''),
      type: String(r['type'] ?? (Array.isArray(r['types']) ? r['types'][0] : '') ?? ''),
    }));
  }

  async getInsights(opts: InsightsOptions): Promise<QlooPlace[]> {
    const params = new URLSearchParams({
      'filter.type': opts.filterType ?? 'urn:entity:place',
      'signal.interests.entities': opts.entityIds.join(','),
      take: String(opts.take ?? 10),
    });
    if (opts.locationQuery) params.set('filter.location.query', opts.locationQuery);
    const res = await fetch(`${qlooBase()}/v2/insights?${params}`, { headers: this.headers() });
    if (!res.ok) throw new QlooError(`Qloo insights failed: HTTP ${res.status}`, res.status);
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
    return (data.results ?? []).map((r) => {
      const loc = (r['location'] ?? r['geocode'] ?? {}) as Record<string, unknown>;
      const tags = Array.isArray(r['tags'])
        ? (r['tags'] as Array<Record<string, unknown> | string>).map((t) =>
            String(typeof t === 'string' ? t : (t['name'] ?? '')),
          )
        : [];
      return {
        id: String(r['id'] ?? r['entity_id'] ?? ''),
        name: String(r['name'] ?? ''),
        lat: typeof loc['lat'] === 'number' ? (loc['lat'] as number) : null,
        lng: typeof loc['lng'] === 'number' ? (loc['lng'] as number) : null,
        affinity: Number(r['affinity'] ?? 0),
        tags,
        address: typeof loc['address'] === 'string' ? (loc['address'] as string) : undefined,
      };
    });
  }
}

/** Canned client for building before the API key arrives. Realistic shapes, zero network. */
export class FixtureQlooClient implements QlooClient {
  readonly mode = 'mock' as const;

  private entities: QlooEntity[] = [
    { id: 'ent-jazz-001', name: 'Miles Davis', type: 'urn:entity:artist' },
    { id: 'ent-film-001', name: 'Wes Anderson', type: 'urn:entity:director' },
    { id: 'ent-food-001', name: 'Sushi', type: 'urn:entity:cuisine' },
    { id: 'ent-music-002', name: 'Bossa Nova', type: 'urn:entity:genre' },
  ];

  private places: QlooPlace[] = [
    {
      id: 'plc-001',
      name: 'The Blue Note Jazz Bar',
      lat: 19.0596,
      lng: 72.8295,
      affinity: 0.94,
      tags: ['jazz', 'live music', 'cocktails'],
      address: 'Bandra West, Mumbai',
    },
    {
      id: 'plc-002',
      name: 'Quirky Wes Café',
      lat: 19.0601,
      lng: 72.8301,
      affinity: 0.89,
      tags: ['quirky', 'desserts', 'film posters'],
      address: 'Bandra West, Mumbai',
    },
    {
      id: 'plc-003',
      name: 'Omakase Room',
      lat: 19.0589,
      lng: 72.8288,
      affinity: 0.91,
      tags: ['sushi', 'omakase', 'date night'],
      address: 'Bandra West, Mumbai',
    },
  ];

  async searchEntities(query: string, limit = 5): Promise<QlooEntity[]> {
    const q = query.toLowerCase();
    return this.entities.filter((e) => e.name.toLowerCase().includes(q)).slice(0, limit);
  }

  async getInsights(opts: InsightsOptions): Promise<QlooPlace[]> {
    void opts;
    return [...this.places];
  }
}

export function qlooClientFromEnv(env: NodeJS.ProcessEnv = process.env): QlooClient {
  if (env['QLOO_MOCK'] === 'true') return new FixtureQlooClient();
  const key = env['QLOO_API_KEY'];
  if (!key) {
    throw new Error('QLOO_API_KEY is required at boot (or set QLOO_MOCK=true for fixture mode)');
  }
  return new HttpQlooClient(key);
}
