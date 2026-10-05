import { randomUUID } from 'node:crypto';
import { getLatestPlan, savePlan, type Plan } from './db.js';
import { extractIntent, type OutingIntent } from './intent.js';
import type { LLMClient } from './llm.js';
import type { QlooClient, QlooPlace } from './qloo.js';

export interface AgentResult {
  plan: Plan | null;
  /** Chat-visible message */
  reply: string;
  sessionId: string;
  intent: OutingIntent;
}

interface AssemblyStop {
  placeId: string;
  rationale: string;
}

interface Assembly {
  stops: AssemblyStop[];
  summary: string;
  reply: string;
}

const ASSEMBLY_SYSTEM = `You are TasteRoute's planner. Given the user's outing intent and candidate venues from Qloo's taste graph, assemble an evening itinerary.
Return STRICT JSON only — no prose, no markdown:
{ "stops": [{ "placeId": string, "rationale": string }], "summary": string, "reply": string }
Rules:
- Pick 2-4 stops, ordered for a real evening (dinner before a late-night bar).
- Every stop MUST use an exact placeId from the candidates list. Never invent venues.
- rationale: one sentence linking the stop to the user's stated tastes.
- reply: a 2-sentence chat summary of the plan, warm and specific.
- Respect budget: "low" prefers casual spots; "high" allows fine dining.
- When refining an existing plan (provided below), keep stops the user didn't mention stable.`;

function buildAssemblyUser(
  intent: OutingIntent,
  places: QlooPlace[],
  prior: Plan | null,
): string {
  const cands = places
    .map(
      (p) =>
        `- ${p.id}: ${p.name} (affinity ${p.affinity.toFixed(2)}, tags: ${p.tags.join(', ')})${p.address ? ` — ${p.address}` : ''}`,
    )
    .join('\n');
  const priorText = prior
    ? `\nExisting plan to refine:\n${prior.itinerary.stops.map((s) => `- ${s.name}: ${s.rationale}`).join('\n')}`
    : '';
  return `Intent: ${JSON.stringify({
    occasion: intent.occasion,
    vibe: intent.vibe,
    tastes: intent.tastes,
    groupSize: intent.groupSize,
    budget: intent.budget,
    area: intent.area,
  })}\n\nCandidate venues:\n${cands}${priorText}`;
}

function sanitizeAssembly(raw: unknown, places: QlooPlace[]): Assembly {
  const r = (raw ?? {}) as Record<string, unknown>;
  const byId = new Map(places.map((p) => [p.id, p]));
  const stops: AssemblyStop[] = [];
  if (Array.isArray(r['stops'])) {
    for (const s of r['stops'] as Array<Record<string, unknown>>) {
      const id = typeof s['placeId'] === 'string' ? s['placeId'] : '';
      if (byId.has(id) && stops.length < 4) {
        stops.push({
          placeId: id,
          rationale:
            typeof s['rationale'] === 'string' && s['rationale'] ? s['rationale'] : 'A strong taste match.',
        });
      }
    }
  }
  return {
    stops,
    summary: typeof r['summary'] === 'string' ? r['summary'] : '',
    reply: typeof r['reply'] === 'string' && r['reply'] ? r['reply'] : 'Here is your evening, planned with taste.',
  };
}

export async function runAgentTurn(
  deps: { llm: LLMClient; qloo: QlooClient },
  input: { message: string; sessionId?: string },
): Promise<AgentResult> {
  const sessionId = input.sessionId ?? randomUUID();
  const intent = await extractIntent(deps.llm, input.message);

  if (intent.needsClarification) {
    return {
      plan: null,
      reply: intent.clarifyingQuestion ?? 'What kind of evening are you planning?',
      sessionId,
      intent,
    };
  }

  // 1. Resolve taste mentions -> Qloo entity IDs (cap 4 tastes x 2 entities).
  const entityIds: string[] = [];
  for (const taste of intent.tastes.slice(0, 4)) {
    const entities = await deps.qloo.searchEntities(taste, 2);
    for (const e of entities) {
      if (e.id && !entityIds.includes(e.id)) entityIds.push(e.id);
    }
  }
  if (entityIds.length === 0) {
    return {
      plan: null,
      intent,
      sessionId,
      reply:
        "I couldn't find those tastes in the taste graph — try an artist, film, cuisine, or brand you love, like 'jazz', 'Wes Anderson', or 'sushi'.",
    };
  }

  // 2. Cross-domain insights: taste signals -> places.
  const places = await deps.qloo.getInsights({
    entityIds,
    filterType: 'urn:entity:place',
    locationQuery: intent.area ?? undefined,
    take: 10,
  });
  if (places.length === 0) {
    return {
      plan: null,
      intent,
      sessionId,
      reply: 'The taste graph came up empty for that combo — try a different area or vibe.',
    };
  }

  // 3. LLM assembles the itinerary (with prior plan for refinements).
  const prior = await getLatestPlan(sessionId);
  const assembly = sanitizeAssembly(
    await deps.llm.completeJSON<unknown>(
      ASSEMBLY_SYSTEM,
      buildAssemblyUser(intent, places, prior),
    ),
    places,
  );
  if (assembly.stops.length === 0) {
    throw new Error('planner returned no valid stops');
  }

  // 4. Persist.
  const byId = new Map(places.map((p) => [p.id, p]));
  const plan = await savePlan({
    sessionId,
    brief: {
      occasion: intent.occasion,
      vibe: intent.vibe,
      tastes: intent.tastes,
      groupSize: intent.groupSize,
      budget: intent.budget,
      area: intent.area,
    },
    itinerary: {
      stops: assembly.stops.map((s) => {
        const p = byId.get(s.placeId)!;
        return {
          name: p.name,
          category: 'place',
          lat: p.lat,
          lng: p.lng,
          affinity: p.affinity,
          rationale: s.rationale,
          qlooId: p.id,
        };
      }),
      summary: assembly.summary,
    },
  });

  return { plan, reply: assembly.reply, sessionId, intent };
}
