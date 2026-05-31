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
  const result = await model.generateContent(buildPrompt(text, targetCount));
  const raw = result.response.text();

  // Safe JSON parse — Gemini JSON mode should always return valid JSON,
  // but we validate the shape too before it ever touches the IR.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${raw.slice(0, 200)}`);
  }

  return ChunksResponseSchema.parse(parsed);
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
    console.warn("[chunkingAgent] First attempt failed, retrying once…", firstErr);
    try {
      return await attemptChunk(text, targetCount);
    } catch (retryErr) {
      console.error("[chunkingAgent] Both attempts failed", retryErr);
      throw new Error(
        `Gemini chunking failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
      );
    }
  }
}
