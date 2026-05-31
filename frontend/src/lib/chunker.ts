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
  // "gemini" = real LLM ran; "mock" = Gemini unavailable, used paragraph-split fallback.
  source: "gemini" | "mock";
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
// Maps ChunkResult[] → raw bucket nodes + narrative edges.
//
// Graph structure:
//   • Title bucket   — top-center, the argument's entry point
//   • Storyboard buckets — grid of rows below the title, left-to-right narrative flow
//   • Edges: title → first storyboard (main entry), then sequence between storyboards
//
// IMPORTANT: these are INFO BUCKETS, not slides. elements[] is empty.
// Slide design happens lazily on double-click via the slide-design agent
// (see slideDesignAgent.ts — SLIDE-DESIGN AGENT SWAP POINT).
function buildSlideNodes(chunks: ChunkResult[]): Pick<HydrateResult, "nodes" | "edges"> {
  const COLS_PER_ROW = 4;
  const COL_W = 360;
  const COL_GAP = 40;
  const ROW_H = 240;
  const ROW_GAP = 60;
  const ts = Date.now();

  const bucketBase = {
    width: COL_W,
    height: ROW_H,
    state: "rendered" as SlideState,
    designStatus: "bucket" as DesignStatus,
    elements: [],
    candidates: [],
    activeDesignId: null as null,
  };

  // Separate title bucket (first kind="title" chunk) from storyboard chunks.
  // If Gemini doesn't produce a title chunk, synthesize one from the first chunk.
  const titleIdx = chunks.findIndex((c) => c.kind === "title");
  const titleChunk: ChunkResult =
    titleIdx >= 0
      ? chunks[titleIdx]
      : { headline: chunks[0]?.headline ?? "Untitled", body: chunks[0]?.body ?? "", kind: "title" };
  const storyChunks = titleIdx >= 0
    ? chunks.filter((_, i) => i !== titleIdx)
    : chunks.slice(1);

  // Title node — centered above the storyboard grid
  const gridWidth = COLS_PER_ROW * COL_W + (COLS_PER_ROW - 1) * COL_GAP;
  const titleX = 80 + gridWidth / 2 - COL_W / 2;
  const titleNode: SlideNode = {
    id: `gen-title-${ts}`,
    index: 1,
    title: titleChunk.headline,
    kind: "title" as SceneKind,
    status: "draft" as SceneStatus,
    eyebrow: titleChunk.eyebrow,
    body: titleChunk.body,
    x: titleX,
    y: 50,
    ...bucketBase,
  };

  // Storyboard nodes — 4-column grid, two rows below the title node
  const STORY_Y = 50 + ROW_H + ROW_GAP * 2;
  const storyNodes: SlideNode[] = storyChunks.map((chunk, i) => ({
    id: `gen-${ts}-${i}`,
    index: i + 2,
    title: chunk.headline,
    kind: chunk.kind as SceneKind,
    status: "draft" as SceneStatus,
    eyebrow: chunk.eyebrow,
    body: chunk.body,
    x: 80 + (i % COLS_PER_ROW) * (COL_W + COL_GAP),
    y: STORY_Y + Math.floor(i / COLS_PER_ROW) * (ROW_H + ROW_GAP),
    ...bucketBase,
  }));

  const nodes = [titleNode, ...storyNodes];

  // Edges: title → first storyboard node (entry), then sequence through narrative
  const edges: Edge[] = [
    ...(storyNodes.length > 0
      ? [{ from: titleNode.id, to: storyNodes[0].id, relation: "sequence" as EdgeRelation }]
      : []),
    ...storyNodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: storyNodes[i + 1].id,
      relation: "sequence" as EdgeRelation,
    })),
  ];

  return { nodes, edges };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function hydrateToSlides(
  text: string,
  duration: TargetDuration,
): Promise<HydrateResult> {
  const targetCount = durationToSlideCount(duration);

  let chunks: ChunkResult[];
  let source: HydrateResult["source"];
  try {
    chunks = await chunkIntoScenes(text, targetCount);
    source = "gemini";
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[chunker] Gemini unavailable — mock fallback active.\n  Reason:", errMsg);
    chunks = mockChunkIntoScenes(text, targetCount);
    source = "mock";
  }

  return { ...buildSlideNodes(chunks), source };
}
