import { z } from "zod";

// ─── Shared types ─────────────────────────────────────────────────────────────
// ChunkResult is the contract between the LLM output and the IR hydration step.
// Both the backend schema validator and the frontend hydration function use this shape.
// Do NOT change this interface without updating hydrateToSlides() in chunker.ts.

export type SceneKind = "title" | "problem" | "data";

export interface ChunkResult {
  headline: string;   // slide title — punchy, max ~10 words
  body: string;       // supporting text / bullets
  kind: SceneKind;    // narrative type → drives SlideNode.kind
  eyebrow?: string;   // optional ALL-CAPS label, e.g. "THE PROBLEM"
}

export interface ChunkRequestBody {
  text: string;
  targetCount: number;
}

export interface ChunkResponseBody {
  chunks: ChunkResult[];
}

// ─── Zod runtime validators ───────────────────────────────────────────────────
export const ChunkResultSchema = z.object({
  headline: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  kind: z.enum(["title", "problem", "data"]),
  eyebrow: z.string().max(60).optional(),
});

export const ChunksResponseSchema = z.array(ChunkResultSchema).min(1).max(30);

export const ChunkRequestSchema = z.object({
  text: z.string().min(1).max(50_000),
  targetCount: z.number().int().min(1).max(30),
});
