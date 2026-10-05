import { afterEach, describe, expect, it } from 'vitest';
import { runAgentTurn } from './agent.js';
import { __resetDbForTests, getLatestPlan, getPlan } from './db.js';
import { FixtureLLM, type LLMClient } from './llm.js';
import { FixtureQlooClient, type QlooClient } from './qloo.js';

function fakeLLM(payload: unknown): LLMClient {
  return { mode: 'mock', completeJSON: async () => payload };
}

function emptyQloo(): QlooClient {
  return {
    mode: 'mock',
    searchEntities: async () => [],
    getInsights: async () => [],
  };
}

describe('runAgentTurn (mock mode)', () => {
  afterEach(() => __resetDbForTests());

  const deps = { llm: new FixtureLLM(), qloo: new FixtureQlooClient() };

  it('turns one message into a persisted plan with taste rationales', async () => {
    const result = await runAgentTurn(deps, { message: 'anniversary dinner, jazz and sushi in Bandra' });

    expect(result.plan).not.toBeNull();
    expect(result.reply.length).toBeGreaterThan(10);
    expect(result.intent.tastes).toContain('Miles Davis');

    const stops = result.plan!.itinerary.stops;
    expect(stops.length).toBeGreaterThanOrEqual(2);
    for (const s of stops) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.rationale.length).toBeGreaterThan(10);
      expect(s.affinity).toBeGreaterThan(0);
    }
    // Rationales reference the user's tastes (FR-4)
    const rationales = stops.map((s) => s.rationale).join(' ');
    expect(rationales).toMatch(/Miles Davis|Wes Anderson|sushi/i);

    // Persisted and retrievable (FR-8)
    const fetched = await getPlan(result.plan!.id);
    expect(fetched!.itinerary.stops.length).toBe(stops.length);
  });

  it('returns clarification (no plan) for unusable briefs', async () => {
    const llm = fakeLLM({ needsClarification: true, clarifyingQuestion: 'What vibe?' });
    const result = await runAgentTurn({ llm, qloo: new FixtureQlooClient() }, { message: 'hi' });
    expect(result.plan).toBeNull();
    expect(result.reply).toBe('What vibe?');
  });

  it('clarifies when no tastes resolve to entities', async () => {
    const result = await runAgentTurn({ llm: new FixtureLLM(), qloo: emptyQloo() }, { message: 'anniversary dinner' });
    expect(result.plan).toBeNull();
    expect(result.reply).toMatch(/taste graph/i);
  });

  it('refinement keeps the session and saves a new plan', async () => {
    const first = await runAgentTurn(deps, { message: 'anniversary dinner in Bandra' });
    const second = await runAgentTurn(deps, {
      message: 'make it cheaper',
      sessionId: first.sessionId,
    });
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.plan).not.toBeNull();
    expect(second.plan!.id).not.toBe(first.plan!.id);
    const latest = await getLatestPlan(first.sessionId);
    expect(latest!.id).toBe(second.plan!.id);
  });

  it('drops hallucinated stops (placeIds not in candidates)', async () => {
    const sneaky: LLMClient = {
      mode: 'mock',
      completeJSON: async (system: string) => {
        if (system.includes("TasteRoute's planner")) {
          return {
            stops: [
              { placeId: 'plc-jazz-den', rationale: 'Real one.' },
              { placeId: 'plc-hallucinated-999', rationale: 'Made up.' },
            ],
            summary: 's',
            reply: 'r',
          };
        }
        return {
          occasion: 'date',
          vibe: [],
          tastes: ['Miles Davis'],
          groupSize: 2,
          budget: 'medium',
          area: 'Bandra',
          needsClarification: false,
        };
      },
    };
    const result = await runAgentTurn(
      { llm: sneaky, qloo: new FixtureQlooClient() },
      { message: 'date night' },
    );
    expect(result.plan!.itinerary.stops.map((s) => s.name)).toEqual(['The Jazz Den']);
  });
});
