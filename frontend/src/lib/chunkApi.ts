// Server function — runs only on the server. GEMINI_API_KEY never reaches the browser.
// The @tanstack/router-plugin compiler extracts the handler + imports to the server bundle;
// the client receives an auto-generated stub that makes the HTTP call.
import { createServerFn } from "@tanstack/react-start";
import { handleChunkRequest } from "@backend/landing-page/proxyHandler";
import type { ChunkResponseBody } from "@backend/landing-page/chunkingSchema";

interface ChunkInput {
  text: string;
  targetCount: number;
}

// LLM SWAP POINT — the handler below is the single boundary between the UI and Gemini.
// To swap the model/provider: edit backend/landing-page/geminiClient.ts.
// To swap to a different backend service: replace handleChunkRequest's body.
// Input/output contract stays identical; chunker.ts is untouched.
export const chunkDeck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input as ChunkInput)
  .handler(({ data }): Promise<ChunkResponseBody> => handleChunkRequest(data));
