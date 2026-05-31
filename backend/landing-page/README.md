# backend/landing-page

Self-contained backend module for the Projektor landing-page feature.
Turns a brain-dump text + target duration into a structured slide deck
by calling Gemini 2.0 Flash with JSON response mode.

## Module structure

```
backend/landing-page/
  chunkingSchema.ts   — shared types + Zod validators (no framework deps)
  geminiClient.ts     — Gemini SDK setup, system prompt, response schema
  chunkingAgent.ts    — chunking orchestration: prompt build, call, retry, validate
  proxyHandler.ts     — input validation + entry point for the HTTP layer
```

The HTTP layer lives in the frontend project at:
```
frontend/src/routes/api/chunk.ts   — TanStack Start API route (POST /api/chunk)
```

## Where the key lives

`GEMINI_API_KEY` is read **only** in `geminiClient.ts` via `process.env.GEMINI_API_KEY`.
It is never imported by any frontend module and never bundled into the client.

## Local setup

1. Copy `.env.example` → `frontend/.env.local`
2. Add your Gemini API key
3. `cd frontend && npm run dev`

The API route is at `POST /api/chunk` once the dev server is running.

## Request / response contract

```
POST /api/chunk
Content-Type: application/json

{ "text": "...", "targetCount": 12 }

→ 200 { "chunks": [ { headline, body, kind, eyebrow? }, ... ] }
→ 400 { "error": "Invalid request: ..." }
→ 500 { "error": "Gemini chunking failed after retry" }
```

## LLM swap point

To swap the model or provider: edit `chunkingAgent.ts → attemptChunk()`.
The input/output contract (`ChunkResult[]`) stays identical — downstream
hydration in `frontend/src/lib/chunker.ts → buildSlideNodes()` is untouched.

## Merging with future backend features

This module is intentionally isolated. Future modules (e.g. `backend/editor-agent/`,
`backend/argument-intelligence/`) sit as sibling folders:

```
backend/
  landing-page/   ← this module
  editor-agent/   ← future
  .env.example    ← shared across all modules
```

No shared code exists between sibling modules. Each has its own client, schema,
agent, and handler. The TanStack Start API routes in `frontend/src/routes/api/`
are the only integration points.
