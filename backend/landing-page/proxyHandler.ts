// ── Request handler ───────────────────────────────────────────────────────────
//
// handleChunkRequest is the single entry point from the TanStack server function
// (chunkApi.ts → chunkDeck). It sits between the network boundary and the LLM:
//
//   chunkDeck (createServerFn)
//     → handleChunkRequest(rawBody)   ← YOU ARE HERE
//       → ChunkRequestSchema.safeParse()   validates text + targetCount
//       → callChunkingAgent()              calls Gemini, retries once on failure
//         → returns ChunkResult[]
//     → returns { chunks: ChunkResult[] }
//
// Input validation happens here (not in the server function) so bad requests
// are rejected before any LLM tokens are spent. The Zod schema enforces:
//   • text: non-empty string, max 50 000 chars
//   • targetCount: integer 1–30
// Anything outside those bounds gets a 400-equivalent error thrown.

import { callChunkingAgent } from "./chunkingAgent";
import {
  ChunkRequestSchema,
  type ChunkResponseBody,
} from "./chunkingSchema";

export async function handleChunkRequest(
  rawBody: unknown,
): Promise<ChunkResponseBody> {
  // Validate input before touching the LLM.
  // safeParse() never throws — it returns { success, data } or { success, error }.
  const parsed = ChunkRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw Object.assign(
      new Error(`Invalid request: ${parsed.error.issues.map((i: { message: string }) => i.message).join(", ")}`),
      { status: 400 },
    );
  }

  const chunks = await callChunkingAgent({
    text: parsed.data.text,
    targetCount: parsed.data.targetCount,
  });

  return { chunks };
}
