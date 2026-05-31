// ── Gemini chunking agent ─────────────────────────────────────────────────────
//
// callChunkingAgent is the single function that talks to Gemini. It wraps the
// raw SDK call with:
//   1. A prompt builder (buildPrompt)
//   2. JSON parsing + Zod schema validation of the response
//   3. One automatic retry on any failure (network blip, quota spike, bad JSON)
//
// Error labels: every thrown error starts with a bracketed label so callers
// can identify the failure stage without parsing free-text messages:
//   [GEMINI_API_ERROR]    — the HTTP/SDK call itself failed
//   [GEMINI_PARSE_ERROR]  — Gemini returned non-JSON (shouldn't happen in JSON mode)
//   [GEMINI_SCHEMA_ERROR] — Gemini returned JSON that failed ChunksResponseSchema
//
// These labels bubble up through proxyHandler → chunkApi → chunker.ts, where
// chunker catches them and falls back to the mock paragraph-split path.
// LandingPage.tsx reads the label to show a targeted error message.

import { getChunkingModel } from "./geminiClient";
import {
  ChunksResponseSchema,
  type ChunkResult,
  type ChunkRequestBody,
} from "./chunkingSchema";

// Builds the user-turn prompt sent alongside the system instruction.
// The model + system instruction are configured in geminiClient.ts.
function buildPrompt(text: string, targetCount: number): string {
  return `Chunk the following brain-dump into exactly ${targetCount} slides.\n\n${text}`;
}

// Single Gemini attempt: call → parse JSON → validate schema → return chunks.
// Throws a labelled error at whichever stage fails.
async function attemptChunk(
  text: string,
  targetCount: number,
): Promise<ChunkResult[]> {
  const model = getChunkingModel();

  // ── Stage 1: Gemini API call ────────────────────────────────────────────────
  // generateContent() resolves when Gemini finishes generating the full response.
  // Streaming is not used here — slide counts are small enough that latency
  // difference is negligible and streaming complicates schema validation.
  let raw: string;
  try {
    const result = await model.generateContent(buildPrompt(text, targetCount));
    raw = result.response.text();
  } catch (err) {
    throw new Error(
      `[GEMINI_API_ERROR] Gemini API call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Stage 2: JSON parse ─────────────────────────────────────────────────────
  // With responseMimeType: "application/json" + responseSchema set in
  // geminiClient.ts, Gemini should always return valid JSON. We parse anyway
  // because the SDK's JSON mode is best-effort, not guaranteed.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[GEMINI_PARSE_ERROR] Gemini returned non-JSON: ${raw.slice(0, 300)}`);
  }

  // ── Stage 3: Schema validation ──────────────────────────────────────────────
  // ChunksResponseSchema (zod) checks that every chunk has headline, body, kind,
  // and that values are within the length/enum constraints. This is belt-and-
  // suspenders on top of the SDK's server-side schema enforcement.
  try {
    return ChunksResponseSchema.parse(parsed);
  } catch (err) {
    throw new Error(
      `[GEMINI_SCHEMA_ERROR] Gemini output failed validation: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ── MODEL/PROVIDER SWAP POINT ─────────────────────────────────────────────────
// To change the model: update geminiClient.ts → getChunkingModel().
// To swap the provider entirely: replace attemptChunk()'s body.
// The function signature and return type (ChunkResult[]) must stay the same;
// everything above this layer is provider-agnostic.
export async function callChunkingAgent(
  body: ChunkRequestBody,
): Promise<ChunkResult[]> {
  const { text, targetCount } = body;

  // First attempt
  try {
    return await attemptChunk(text, targetCount);
  } catch (firstErr) {
    // Log the failure stage label so it's visible in the server terminal
    const label = firstErr instanceof Error ? firstErr.message.split("]")[0] + "]" : "[UNKNOWN]";
    console.warn(`[chunkingAgent] First attempt failed (${label}), retrying once…`);

    // Single retry — covers transient Gemini errors (rate limits, network blips).
    // We don't retry more than once to avoid burning quota on a bad prompt.
    try {
      return await attemptChunk(text, targetCount);
    } catch (retryErr) {
      console.error("[chunkingAgent] Both attempts failed:", retryErr);
      // Re-throw with the original labelled message so chunker.ts can identify
      // the stage and LandingPage.tsx can show the right error copy.
      throw new Error(
        retryErr instanceof Error ? retryErr.message : `[GEMINI_ERROR] ${String(retryErr)}`,
      );
    }
  }
}
