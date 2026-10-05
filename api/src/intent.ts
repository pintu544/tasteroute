import type { LLMClient } from './llm.js';

export interface OutingIntent {
  occasion: string;
  vibe: string[];
  tastes: string[];
  groupSize: number | null;
  budget: 'low' | 'medium' | 'high' | null;
  area: string | null;
  needsClarification: boolean;
  clarifyingQuestion?: string;
}

const SYSTEM = `You extract structured outing intent for TasteRoute, a taste-based evening planner.
Return STRICT JSON only — no prose, no markdown. Keys:
{
  "occasion": string,            // e.g. "anniversary dinner", "night out with friends"
  "vibe": string[],              // mood words, e.g. ["romantic", "live music"]
  "tastes": string[],            // artists, movies, cuisines, brands, genres the user mentions
  "groupSize": number | null,
  "budget": "low" | "medium" | "high" | null,
  "area": string | null,         // neighborhood / city the user mentions
  "needsClarification": boolean,
  "clarifyingQuestion": string    // only when needsClarification is true
}
If the message has no usable outing content (greetings, gibberish, off-topic),
set needsClarification=true and ask a friendly question about what kind of evening they want to plan.
Be generous: "jazz and sushi in Bandra" is a full brief, not a clarification case.`;

function sanitize(raw: unknown): OutingIntent {
  const r = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const budget = r['budget'];
  return {
    occasion: str(r['occasion']),
    vibe: strArr(r['vibe']),
    tastes: strArr(r['tastes']),
    groupSize: typeof r['groupSize'] === 'number' ? r['groupSize'] : null,
    budget: budget === 'low' || budget === 'medium' || budget === 'high' ? budget : null,
    area: typeof r['area'] === 'string' ? (r['area'] as string) : null,
    needsClarification: r['needsClarification'] === true,
    clarifyingQuestion:
      typeof r['clarifyingQuestion'] === 'string' ? (r['clarifyingQuestion'] as string) : undefined,
  };
}

/** Extract structured outing intent from a chat message. Never throws on weird input. */
export async function extractIntent(llm: LLMClient, message: string): Promise<OutingIntent> {
  const raw = await llm.completeJSON<unknown>(SYSTEM, message);
  const intent = sanitize(raw);
  if (!intent.occasion && !intent.needsClarification) {
    intent.needsClarification = true;
    intent.clarifyingQuestion =
      intent.clarifyingQuestion ??
      'What kind of evening are you planning? Tell me the occasion, the vibe, and anything you love — music, films, food.';
  }
  return intent;
}
