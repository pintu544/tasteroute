import { describe, expect, it } from 'vitest';
import { extractIntent } from './intent.js';
import type { LLMClient } from './llm.js';

function fakeLLM(payload: unknown): LLMClient {
  return { mode: 'mock', completeJSON: async () => payload };
}

describe('extractIntent', () => {
  it('extracts a full brief', async () => {
    const intent = await extractIntent(
      fakeLLM({
        occasion: 'date night',
        vibe: ['jazz', 'romantic'],
        tastes: ['Miles Davis', 'sushi'],
        groupSize: 2,
        budget: 'high',
        area: 'Bandra',
        needsClarification: false,
      }),
      'date night with jazz and sushi in Bandra',
    );
    expect(intent).toMatchObject({
      occasion: 'date night',
      tastes: ['Miles Davis', 'sushi'],
      groupSize: 2,
      budget: 'high',
      area: 'Bandra',
      needsClarification: false,
    });
  });

  it('sanitizes garbage into safe defaults', async () => {
    const intent = await extractIntent(
      fakeLLM({ occasion: 42, vibe: 'loud', budget: 'extreme', groupSize: 'many' }),
      'whatever',
    );
    expect(intent.occasion).toBe('');
    expect(intent.vibe).toEqual([]);
    expect(intent.budget).toBeNull();
    expect(intent.groupSize).toBeNull();
    // Empty occasion with no clarification flag -> becomes a clarification
    expect(intent.needsClarification).toBe(true);
    expect(intent.clarifyingQuestion).toMatch(/evening/i);
  });

  it('passes through a clarifying question for empty briefs', async () => {
    const intent = await extractIntent(
      fakeLLM({ needsClarification: true, clarifyingQuestion: 'What vibe?' }),
      'hi',
    );
    expect(intent.needsClarification).toBe(true);
    expect(intent.clarifyingQuestion).toBe('What vibe?');
  });
});
