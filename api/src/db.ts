import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { Pool } from 'pg';

export interface PlanItineraryStop {
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  affinity: number;
  rationale: string;
  qlooId?: string;
}

export interface PlanBrief {
  occasion?: string;
  vibe?: string[];
  tastes?: string[];
  groupSize?: number | null;
  budget?: string | null;
  area?: string | null;
}

export interface Plan {
  id: string;
  sessionId: string;
  brief: PlanBrief;
  itinerary: { stops: PlanItineraryStop[]; summary?: string };
  createdAt: string;
}

type DbClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  brief JSONB NOT NULL DEFAULT '{}',
  itinerary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plans_session_id_idx ON plans (session_id);
`;

let pool: Pool | null = null;
let memPool: { query: DbClient['query']; end?: () => Promise<void> } | null = null;
let schemaReady = false;

function isPostgresUrl(url: string | undefined): boolean {
  return !!url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));
}

/** Real Postgres when DATABASE_URL is set, pg-mem otherwise. Schema ensured idempotently. */
export async function getDb(): Promise<DbClient> {
  if (memPool) return memPool;
  if (pool) return pool;

  const url = process.env['DATABASE_URL'];
  if (isPostgresUrl(url)) {
    // Render Postgres requires SSL; rejectUnauthorized:false matches their setup.
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    const client: DbClient = {
      query: (text, params) => pool!.query(text, params as unknown[]),
    };
    await client.query(SCHEMA);
    schemaReady = true;
    return client;
  }

  const db = newDb();
  const { Pool: MemPool } = db.adapters.createPg();
  const p = new MemPool();
  memPool = { query: (text, params) => p.query(text, params) };
  await memPool.query(SCHEMA);
  schemaReady = true;
  return memPool;
}

export function isSchemaReady(): boolean {
  return schemaReady;
}

export async function savePlan(input: {
  sessionId: string;
  brief: PlanBrief;
  itinerary: Plan['itinerary'];
}): Promise<Plan> {
  const db = await getDb();
  const id = randomUUID();
  const briefJson = JSON.stringify(input.brief);
  const itineraryJson = JSON.stringify(input.itinerary);
  await db.query(
    `INSERT INTO plans (id, session_id, brief, itinerary) VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
    [id, input.sessionId, briefJson, itineraryJson],
  );
  const row = await getPlan(id);
  if (!row) throw new Error('savePlan: row vanished after insert');
  return row;
}

export async function getPlan(id: string): Promise<Plan | null> {
  const db = await getDb();
  const { rows } = await db.query(`SELECT * FROM plans WHERE id = $1`, [id]);
  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r['id']),
    sessionId: String(r['session_id']),
    brief: (r['brief'] ?? {}) as PlanBrief,
    itinerary: (r['itinerary'] ?? { stops: [] }) as Plan['itinerary'],
    createdAt: String(r['created_at']),
  };
}

/** Latest plan in a session (for refinements). Null when the session has no plans yet. */
export async function getLatestPlan(sessionId: string): Promise<Plan | null> {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT * FROM plans WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [sessionId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r['id']),
    sessionId: String(r['session_id']),
    brief: (r['brief'] ?? {}) as PlanBrief,
    itinerary: (r['itinerary'] ?? { stops: [] }) as Plan['itinerary'],
    createdAt: String(r['created_at']),
  };
}

/** Test-only: reset module state so each test file gets a fresh in-memory DB. */
export function __resetDbForTests(): void {
  pool = null;
  memPool = null;
  schemaReady = false;
}
