// ── Gemini chunking server function ───────────────────────────────────────────
//
// createServerFn() is a TanStack Start primitive. At build time, the
// @tanstack/router-plugin/vite compiler scans all imports and splits the code:
//
//   CLIENT BUNDLE  → receives an auto-generated HTTP stub that POSTs to
//                    /_server (TanStack's internal server-function endpoint).
//   SERVER BUNDLE  → receives the real handler + all its server-side imports,
//                    including backend/landing-page/proxyHandler.ts and,
//                    transitively, geminiClient.ts and the Gemini SDK.
//
// Because the handler only ever runs on the server, GEMINI_API_KEY is never
// serialised into the client bundle. This is the ONLY place in the codebase
// where the Gemini API key can be accessed from — via process.env, which is
// a Node.js global unavailable in the browser.
//
// ── Data flow ──────────────────────────────────────────────────────────────────
//
//   chunker.ts (browser)
//     → chunkDeck({ data: { text, targetCount } })   [HTTP POST, auto-stub]
//       → handler (server)
//         → handleChunkRequest(data)
//           → callChunkingAgent({ text, targetCount })
//             → Gemini 2.5 Flash (JSON mode, responseSchema enforced)
//               → ChunkResult[]  ({ headline, body, kind, eyebrow? }[])
//             → returns chunks
//           → returns { chunks }
//         → returns ChunkResponseBody
//       → response serialised and sent back to browser
//     → chunker.ts hydrates nodes/edges from chunks
//
// ── Swap points ────────────────────────────────────────────────────────────────
//   • Change the AI model:    edit backend/landing-page/geminiClient.ts
//   • Change the AI provider: replace handleChunkRequest in proxyHandler.ts
//   • Change the HTTP verb:   change `method: "POST"` below (rare)
//   Input/output contract (ChunkInput / ChunkResponseBody) stays unchanged.

import { createServerFn } from "@tanstack/react-start";
import { handleChunkRequest } from "@backend/landing-page/proxyHandler";
import type { ChunkResponseBody } from "@backend/landing-page/chunkingSchema";

interface ChunkInput {
  text: string;      // raw user brain-dump, already prepended with brand URL if set
  targetCount: number; // slides requested, derived from duration picker in LandingPage
}

export const chunkDeck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input as ChunkInput)
  .handler(({ data }): Promise<ChunkResponseBody> => handleChunkRequest(data));
