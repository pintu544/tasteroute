/**
 * LLM client for structured JSON calls (FastRouter-compatible /chat/completions).
 * FixtureLLM returns canned responses so the agent loop builds without a key.
 */

export interface LLMClient {
  readonly mode: 'live' | 'mock';
  completeJSON<T>(system: string, user: string): Promise<T>;
}

export class LLMError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class FastRouterLLM implements LLMClient {
  readonly mode = 'live' as const;

  constructor(
    private baseUrl: string,
    private model: string,
    private apiKey: string,
  ) {
    if (!apiKey) throw new LLMError('FastRouterLLM requires an API key');
  }

  async completeJSON<T>(system: string, user: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new LLMError(`LLM request failed: HTTP ${res.status}`, res.status);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new LLMError('LLM did not return valid JSON');
    }
  }
}

/** Canned responses for offline development: intent extraction + itinerary assembly. */
export class FixtureLLM implements LLMClient {
  readonly mode = 'mock' as const;

  async completeJSON<T>(system: string, _user: string): Promise<T> {
    // Itinerary-assembly prompt -> canned itinerary referencing fixture place IDs.
    if (system.includes("TasteRoute's planner")) {
      const itinerary = {
        stops: [
          {
            placeId: 'plc-omakase',
            rationale: 'Because you love sushi, this intimate omakase counter is your kind of quiet luxury.',
          },
          {
            placeId: 'plc-jazz-den',
            rationale: 'Because Miles Davis is your north star, their live quartet nights will feel like home.',
          },
          {
            placeId: 'plc-quirky-cafe',
            rationale: 'A Wes Anderson-worthy dessert stop to end the night on a whimsical note.',
          },
        ],
        summary: 'Sushi, then jazz, then dessert — an anniversary evening in Bandra tuned to your taste.',
        reply:
          'Done! Sushi at Omakase Room, live jazz at The Jazz Den, and a whimsical dessert at The Grand Budapest Café. All mapped below.',
      };
      return itinerary as T;
    }
    const intent = {
      occasion: 'anniversary dinner',
      vibe: ['romantic', 'live music', 'quirky'],
      tastes: ['Miles Davis', 'Wes Anderson', 'sushi'],
      groupSize: 2,
      budget: 'medium',
      area: 'Bandra West, Mumbai',
      needsClarification: false,
    };
    return intent as T;
  }
}

export function llmClientFromEnv(env: NodeJS.ProcessEnv = process.env): LLMClient {
  if (env['LLM_MOCK'] === 'true') return new FixtureLLM();
  const key = env['LLM_API_KEY'];
  if (!key) throw new Error('LLM_API_KEY is required at boot (or set LLM_MOCK=true)');
  return new FastRouterLLM(
    env['LLM_BASE_URL'] ?? 'https://api.fastrouter.ai/api/v1',
    env['LLM_MODEL'] ?? 'anthropic/claude-opus-4.7',
    key,
  );
}
