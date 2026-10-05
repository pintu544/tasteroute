import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { qlooClientFromEnv } from './qloo.js';

// Fail loudly at boot when misconfigured (missing key without mock mode).
const qloo = qlooClientFromEnv();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, qloo: qloo.mode });
});

const port = Number(process.env['PORT'] ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`tasteroute api listening on :${port} (qloo: ${qloo.mode})`);
});
