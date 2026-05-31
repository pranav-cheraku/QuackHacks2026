// ── Deck generation pipeline ───────────────────────────────────────────────────
// Entry point: hydrateToSlides(text, duration) → SlideNode[]
// The pipeline is:
//   durationToSlideCount → chunkIntoScenes (LLM SWAP POINT) → buildSlideNodes
//
// chunkIntoScenes calls chunkDeck (a TanStack Start server function) which proxies
// to Gemini server-side — GEMINI_API_KEY never reaches the browser.
// If the server function fails, mockChunkIntoScenes provides a graceful fallback.

import type { SlideNode, Edge, EdgeRelation, SceneKind, SceneStatus, SlideState, DesignStatus } from "./projektor-data";
import { nextId } from "./slide-model";
import { chunkDeck } from "./chunkApi";

// ── Public result type ────────────────────────────────────────────────────────
// Both nodes AND edges come out of the chunker so the graph view can draw
// the narrative skeleton immediately.
export interface HydrateResult {
  nodes: SlideNode[];
  edges: Edge[];
}

export type TargetDuration = 5 | 10 | 20;

// ── ChunkResult ───────────────────────────────────────────────────────────────
// Mirrors backend/landing-page/chunkingSchema.ts ChunkResult exactly.
// Structural match is enforced at the API boundary; keep these in sync.
interface ChunkResult {
  headline: string;
  body: string;
  kind: "title" | "problem" | "data";
  eyebrow?: string;
}

// ── Duration → slide count ────────────────────────────────────────────────────
// Tunable: adjust the table to change pacing. Rule of thumb: ~1–1.5 slides/min.
export function durationToSlideCount(minutes: TargetDuration): number {
  const table: Record<TargetDuration, number> = { 5: 7, 10: 12, 20: 20 };
  return table[minutes];
}

// ── LLM SWAP POINT ────────────────────────────────────────────────────────────
// chunkDeck is a TanStack Start server function — runs server-side, key stays hidden.
// To swap the model: edit backend/landing-page/geminiClient.ts.
// To swap the provider: replace handleChunkRequest in backend/landing-page/proxyHandler.ts.
// input:  text: string, targetCount: number
// output: Promise<ChunkResult[]> — { headline, body, kind, eyebrow? }[]
async function chunkIntoScenes(
  text: string,
  targetCount: number,
): Promise<ChunkResult[]> {
  const result = await chunkDeck({ data: { text, targetCount } });
  if (!Array.isArray(result.chunks) || result.chunks.length === 0) {
    throw new Error("Server returned empty chunks");
  }
  return result.chunks as ChunkResult[];
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
// Used when /api/chunk is unavailable (dev without key, network error, etc.).
function mockChunkIntoScenes(text: string, targetCount: number): ChunkResult[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [{ headline: "Untitled Deck", body: text || "Add your content here.", kind: "title" }];
  }

  const count = Math.min(targetCount, Math.max(1, paragraphs.length));
  const bucketSize = Math.ceil(paragraphs.length / count);
  const chunks: ChunkResult[] = [];

  for (let i = 0; i < count; i++) {
    const slice = paragraphs.slice(i * bucketSize, (i + 1) * bucketSize);
    if (!slice.length) break;

    const firstLine = slice[0].split("\n")[0].replace(/^#+\s*/, "").trim();
    const headline =
      firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
    const rest = [
      slice[0].split("\n").slice(1).join(" ").trim(),
      ...slice.slice(1),
    ]
      .filter(Boolean)
      .join("\n\n");

    const kind: ChunkResult["kind"] =
      i === 0 ? "title" : i % 2 === 0 ? "data" : "problem";
    chunks.push({
      headline: headline || `Section ${i + 1}`,
      body: rest || slice.join(" "),
      kind,
    });
  }

  return chunks;
}

// ── Bucket hydration ──────────────────────────────────────────────────────────
// Maps ChunkResult[] → raw bucket nodes + sequence edges.
// Buckets carry the structural content (headline, body, kind, eyebrow) but NO
// slide design yet. elements[] stays empty — it is populated lazily when the
// user double-clicks a bucket and the slide-design agent runs (see slideDesignAgent.ts).
// Board position: 4-column grid, left-to-right then top-to-bottom.
function buildSlideNodes(chunks: ChunkResult[]): HydrateResult {
  const COLS_PER_ROW = 4;
  const COL_W = 360;
  const ROW_H = 240;

  const nodes: SlideNode[] = chunks.map((chunk, i) => {
    const col = i % COLS_PER_ROW;
    const row = Math.floor(i / COLS_PER_ROW);
    return {
      id: `gen-${Date.now()}-${i}`,
      index: i + 1,
      title: chunk.headline,
      kind: chunk.kind as SceneKind,
      status: "draft" as SceneStatus,
      eyebrow: chunk.eyebrow,
      body: chunk.body,
      x: 80 + col * (COL_W + 40),
      y: 80 + row * (ROW_H + 60),
      width: COL_W,
      height: ROW_H,
      state: "rendered" as SlideState,
      // Raw bucket: no slide design exists yet.
      // elements[] populated by slide-design agent on double-click (see slideDesignAgent.ts).
      designStatus: "bucket" as DesignStatus,
      elements: [],
      candidates: [],
      activeDesignId: null,
    };
  });

  // Sequence edges: narrative flows left-to-right through the argument.
  // These are the default connections; user can rewire them in the graph.
  const edges: Edge[] = nodes.slice(0, -1).map((n, i) => ({
    from: n.id,
    to: nodes[i + 1].id,
    relation: "sequence" as EdgeRelation,
  }));

  return { nodes, edges };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function hydrateToSlides(
  text: string,
  duration: TargetDuration,
): Promise<HydrateResult> {
  const targetCount = durationToSlideCount(duration);

  let chunks: ChunkResult[];
  try {
    chunks = await chunkIntoScenes(text, targetCount);
  } catch (err) {
    console.warn("[chunker] Gemini API unavailable, using mock fallback:", err);
    chunks = mockChunkIntoScenes(text, targetCount);
  }

  return buildSlideNodes(chunks);
}
