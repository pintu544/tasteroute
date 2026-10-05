import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { runAgentTurn } from './agent.js';
import { getPlan } from './db.js';
import { llmClientFromEnv, type LLMClient } from './llm.js';
import { qlooClientFromEnv, type QlooClient } from './qloo.js';

interface Clients {
  qloo: QlooClient;
  llm: LLMClient;
}

// Lazy so tests can set env vars before first use. Still fails loudly on
// misconfiguration — just at first request instead of import time.
let cached: Clients | null = null;
function getClients(): Clients {
  if (!cached) cached = { qloo: qlooClientFromEnv(), llm: llmClientFromEnv() };
  return cached;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  try {
    const { qloo, llm } = getClients();
    res.json({ ok: true, qloo: qloo.mode, llm: llm.mode });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'misconfigured' });
  }
});

/**
 * Full agent loop (T-5): intent -> entity resolution -> Qloo insights ->
 * itinerary assembly -> persistence. Returns clarification instead of a plan
 * when the brief is unusable. Qloo/LLM failures -> 500 JSON (FR-7).
 */
app.post('/api/plan', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  const sessionId =
    typeof req.body?.sessionId === 'string' && req.body.sessionId ? req.body.sessionId : randomUUID();
  try {
    const { llm, qloo } = getClients();
    const result = await runAgentTurn({ llm, qloo }, { message, sessionId });
    res.json({
      sessionId: result.sessionId,
      intent: result.intent,
      reply: result.reply,
      plan: result.plan
        ? {
            id: result.plan.id,
            shareUrl: `/plan/${result.plan.id}`,
            itinerary: result.plan.itinerary,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'plan generation failed',
    });
  }
});

const port = Number(process.env['PORT'] ?? 4000);
if (process.env['VITEST'] !== 'true') {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`tasteroute api listening on :${port}`);
  });
}

/** Shareable plan link (FR-8). */
app.get('/api/plan/:id', async (req, res) => {
  const plan = await getPlan(req.params.id as string);
  if (!plan) {
    res.status(404).json({ error: 'plan not found' });
    return;
  }
  res.json({ plan });
});

export { app };
