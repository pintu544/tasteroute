# TasteRoute

An agentic outing planner powered by Qloo taste intelligence — built for the
**Qloo Agentic Hackathon** ($35,000 real cash, deadline Oct 30, 2026).

Describe your vibe in chat; the agent resolves your tastes through Qloo's
cultural graph and plans your evening on a map. Your music taste picks your
restaurant.

## Structure

- `web/` — Next.js 14 + Tailwind frontend (Vercel)
- `api/` — Express + TypeScript API + agent loop (Render)
- `../goals/qloo-agentic-hackathon-entry/spec/` — SPEC.md, DESIGN.md, TASKS.md

## Quick start

```bash
# API (mock Qloo mode — no key needed)
cd api && cp .env.example .env && npm install && npm run dev

# Web
cd web && npm install && npm run dev
```

Set `QLOO_API_KEY` and unset `QLOO_MOCK` for live taste data.
