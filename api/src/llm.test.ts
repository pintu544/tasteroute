import { describe, expect, it, vi, afterEach } from 'vitest';
import { FastRouterLLM, FixtureLLM, LLMError, llmClientFromEnv } from './llm.js';

describe('llmClientFromEnv', () => {
  it('returns the fixture when LLM_MOCK=true', () => {
    const c = llmClientFromEnv({ LLM_MOCK: 'true' } as NodeJS.ProcessEnv);
    expect(c.mode).toBe('mock');
    expect(c).toBeInstanceOf(FixtureLLM);
  });

  it('throws loudly with no key and no mock flag', () => {
    expect(() => llmClientFromEnv({} as NodeJS.ProcessEnv)).toThrow(/LLM_API_KEY/);
  });

  it('returns the live client with a key', () => {
    const c = llmClientFromEnv({ LLM_API_KEY: 'k' } as NodeJS.ProcessEnv);
    expect(c.mode).toBe('live');
  });
});

describe('FastRouterLLM', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses choices[0].message.content as JSON and sends the key', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"a":1}' } }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const llm = new FastRouterLLM('https://x.test/v1', 'model-z', 'secret');
    expect(await llm.completeJSON('sys', 'user')).toEqual({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.test/v1/chat/completions');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret');
    const body = JSON.parse(init.body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('raises LLMError on HTTP failure and on invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })));
    await expect(new FastRouterLLM('u', 'm', 'k').completeJSON('s', 'u')).rejects.toMatchObject({
      name: 'LLMError',
      status: 429,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
      })),
    );
    await expect(new FastRouterLLM('u', 'm', 'k').completeJSON('s', 'u')).rejects.toMatchObject({
      name: 'LLMError',
    });
  });
});
