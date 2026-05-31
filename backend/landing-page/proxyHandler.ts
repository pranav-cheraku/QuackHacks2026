// Server-side handler — GEMINI_API_KEY stays here, never reaches the browser.
// This is the only module the TanStack Start API route needs to import.

import { callChunkingAgent } from "./chunkingAgent";
import {
  ChunkRequestSchema,
  type ChunkResponseBody,
} from "./chunkingSchema";

export async function handleChunkRequest(
  rawBody: unknown,
): Promise<ChunkResponseBody> {
  // Validate input before touching the LLM
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
