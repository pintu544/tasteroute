import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { extractIntent } from './intent.js';
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
 * T-3: intent extraction only. T-5 extends this into the full agent loop
 * (entity resolution -> Qloo insights -> itinerary assembly -> persistence).
 */
app.post('/api/plan', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  try {
    const { llm } = getClients();
    const intent = await extractIntent(llm, message);
    res.json({ intent });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'intent extraction failed',
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

export { app };
