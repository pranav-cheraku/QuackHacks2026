// ── Shared data contract ──────────────────────────────────────────────────────
//
// This file is the single source of truth for the shape of data that flows
// between the LLM and the frontend graph hydration step. Both sides use it:
//
//   SERVER (chunkingAgent.ts):
//     ChunksResponseSchema.parse(geminiOutput) — validates Gemini's response
//     ChunkRequestSchema.safeParse(body)        — validates the incoming request
//
//   CLIENT (chunker.ts):
//     ChunkResult interface drives buildSlideNodes() → SlideNode layout
//
// If you change ChunkResult, update CHUNKING_RESPONSE_SCHEMA in geminiClient.ts
// (the schema sent to Gemini) AND update buildSlideNodes() in chunker.ts.
//
// ── Import note ───────────────────────────────────────────────────────────────
// zod is imported from "@/server/geminiShim" rather than "zod" directly.
// See frontend/src/server/geminiShim.ts for the full explanation.
// Short: this file lives in backend/ which has no node_modules; the shim
// re-exports zod from inside frontend/src/ where node_modules IS reachable.

import { z } from "@/server/geminiShim";

// ── ChunkResult ───────────────────────────────────────────────────────────────
// One slide's worth of semantic content. Gemini fills these fields; the
// frontend maps them onto SlideNode properties (title, body, kind, eyebrow).

export type SceneKind = "title" | "problem" | "data";

export interface ChunkResult {
  headline: string;   // slide title — punchy, max ~10 words
  body: string;       // supporting text / bullets
  kind: SceneKind;    // narrative type → drives SlideNode.kind
  eyebrow?: string;   // optional ALL-CAPS label, e.g. "THE PROBLEM"
}

// ── HTTP request / response shapes ────────────────────────────────────────────
// These are the raw bodies passed through the createServerFn boundary.

export interface ChunkRequestBody {
  text: string;
  targetCount: number;
}

export interface ChunkResponseBody {
  chunks: ChunkResult[];
}

// ── Zod runtime validators ────────────────────────────────────────────────────
// Used on the server only. The browser never runs these — they're in the
// server bundle because this file is only ever imported from server-side code.

// Validates a single chunk coming back from Gemini.
// Limits prevent runaway output from inflating node content.
export const ChunkResultSchema = z.object({
  headline: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  kind: z.enum(["title", "problem", "data"]),
  eyebrow: z.string().max(60).optional(),
});

// Validates the full array. min(1) ensures we never hydrate an empty graph.
// max(30) is a safety cap — the duration picker tops out at 20 slides.
export const ChunksResponseSchema = z.array(ChunkResultSchema).min(1).max(30);

// Validates the incoming request from the browser before touching the LLM.
// text max is 50 000 chars (~12 000 words) — enough for a full document paste.
export const ChunkRequestSchema = z.object({
  text: z.string().min(1).max(50_000),
  targetCount: z.number().int().min(1).max(30),
});
