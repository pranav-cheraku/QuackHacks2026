import { getChunkingModel } from "./geminiClient";
import {
  ChunksResponseSchema,
  type ChunkResult,
  type ChunkRequestBody,
} from "./chunkingSchema";

function buildPrompt(text: string, targetCount: number): string {
  return `Chunk the following brain-dump into exactly ${targetCount} slides.\n\n${text}`;
}

async function attemptChunk(
  text: string,
  targetCount: number,
): Promise<ChunkResult[]> {
  const model = getChunkingModel();

  let raw: string;
  try {
    const result = await model.generateContent(buildPrompt(text, targetCount));
    raw = result.response.text();
  } catch (err) {
    // Distinct label so callers can identify the failure stage
    throw new Error(
      `[GEMINI_API_ERROR] Gemini API call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Gemini JSON mode should always return valid JSON, but we validate anyway.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[GEMINI_PARSE_ERROR] Gemini returned non-JSON: ${raw.slice(0, 300)}`);
  }

  try {
    return ChunksResponseSchema.parse(parsed);
  } catch (err) {
    throw new Error(
      `[GEMINI_SCHEMA_ERROR] Gemini output failed validation: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// LLM SWAP POINT: this function calls Gemini 2.0 Flash via the proxy.
// To swap models: change `model` in geminiClient.ts → getChunkingModel().
// To swap providers: replace the body of attemptChunk() — input/output contract stays identical.
export async function callChunkingAgent(
  body: ChunkRequestBody,
): Promise<ChunkResult[]> {
  const { text, targetCount } = body;
  try {
    return await attemptChunk(text, targetCount);
  } catch (firstErr) {
    const label = firstErr instanceof Error ? firstErr.message.split("]")[0] + "]" : "[UNKNOWN]";
    console.warn(`[chunkingAgent] First attempt failed (${label}), retrying once…`);
    try {
      return await attemptChunk(text, targetCount);
    } catch (retryErr) {
      console.error("[chunkingAgent] Both attempts failed:", retryErr);
      throw new Error(
        retryErr instanceof Error ? retryErr.message : `[GEMINI_ERROR] ${String(retryErr)}`,
      );
    }
  }
}
