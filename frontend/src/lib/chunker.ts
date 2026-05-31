// ── Deck generation pipeline ───────────────────────────────────────────────────
// Entry point: hydrateToSlides(text, duration) → SlideNode[]
// The pipeline is:
//   durationToSlideCount → chunkIntoScenes (LLM SWAP POINT) → buildSlideNodes
//
// chunkIntoScenes calls chunkDeck (a TanStack Start server function) which proxies
// to Gemini server-side — GEMINI_API_KEY never reaches the browser.
// If the server function fails, mockChunkIntoScenes provides a graceful fallback.

import type { SlideNode, Edge, EdgeRelation, SceneKind, SceneStatus, SlideState, DesignStatus } from "./projektor-data";
import type { ContentNode } from "./ir";
import { nextId } from "./slide-model";
import { chunkDeck } from "./chunkApi";

// ── Public result type ────────────────────────────────────────────────────────
// Both nodes AND edges come out of the chunker so the graph view can draw
// the narrative skeleton immediately.
export interface HydrateResult {
  nodes: SlideNode[];
  edges: Edge[];
  contentPool: ContentNode[];
  // "gemini" = real LLM ran; "mock" = Gemini unavailable, used paragraph-split fallback.
  source: "gemini" | "mock";
  // Present only when source === "mock" — the actual error that caused the fallback.
  mockReason?: string;
}

// ── ChunkResult ───────────────────────────────────────────────────────────────
// Mirrors backend/landing-page/chunkingSchema.ts ChunkResult exactly.
// Structural match is enforced at the API boundary; keep these in sync.
interface ChunkResult {
  headline: string;
  body: string;
  kind: "title" | "problem" | "data";
  eyebrow?: string;
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

// ── Content node extraction ───────────────────────────────────────────────────
// Parse a slide's body text into discrete ContentNode objects.
// • Bullet format: "• item one\n• item two" → one node per bullet
// • Plain text: whole body becomes a single node
const CONTENT_NODE_W = 220;
const CONTENT_NODE_GAP = 16;

function bodyToContentNodes(
  body: string,
  slideNode: SlideNode,
): ContentNode[] {
  const trimmed = body.trim();
  if (!trimmed) return [];

  const isBulletList = trimmed.includes("•");
  const rawItems = isBulletList
    ? trimmed.split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean)
    : [trimmed];

  const baseY = slideNode.y + (slideNode.height ?? 200) + 80;

  return rawItems.map((text, i) => ({
    id: `cp-${slideNode.id}-${i}-${Date.now()}`,
    kind: "text" as const,
    payload: { role: "claim" as const, text },
    sourceRef: slideNode.id,
    graphPosition: {
      x: slideNode.x + i * (CONTENT_NODE_W + CONTENT_NODE_GAP),
      y: baseY,
    },
  }));
}

// ── Bucket hydration ──────────────────────────────────────────────────────────
// Maps ChunkResult[] → root title bucket + exactly 2 path buckets + branch edges.
//
// Graph structure (initial):
//   • Title bucket   — top-center, root of the argument tree
//   • Path A, Path B — two branch nodes below the title (the first fork)
//   • Edges: title →branch→ pathA, title →branch→ pathB
//
// The tree grows on-demand: each leaf node has a "Generate next" button that
// calls the Gemini expansion agent (BoardView.generateOptions) to spawn 2 new
// child nodes with real content. Remaining Gemini chunks are discarded here —
// the user explores the narrative by extending one branch at a time.
//
// IMPORTANT: these are INFO BUCKETS, not slides. root is undefined.
// Slide design happens lazily on double-click via the slide-design agent
// (see slideDesignAgent.ts — SLIDE-DESIGN AGENT SWAP POINT).
function buildSlideNodes(chunks: ChunkResult[]): Pick<HydrateResult, "nodes" | "edges" | "contentPool"> {
  const NODE_W = 320;
  const NODE_H = 200;
  const ts = Date.now();

  const bucketBase = {
    width: NODE_W,
    height: NODE_H,
    state: "rendered" as SlideState,
    designStatus: "bucket" as DesignStatus,
    thumb: "title" as const,
    candidates: [],
    activeDesignId: null as null,
  };

  // Separate title chunk from path chunks. If Gemini doesn't emit a title kind,
  // synthesize one from the first chunk so the root always exists.
  const titleIdx = chunks.findIndex((c) => c.kind === "title");
  const titleChunk: ChunkResult =
    titleIdx >= 0
      ? chunks[titleIdx]
      : { headline: chunks[0]?.headline ?? "Untitled", body: chunks[0]?.body ?? "", kind: "title" };

  // Take exactly 2 non-title chunks as the initial path boxes; the rest are
  // discarded here — the user expands the tree via "Generate next" on each leaf.
  const remaining = titleIdx >= 0
    ? chunks.filter((_, i) => i !== titleIdx)
    : chunks.slice(1);
  const pathChunks = remaining.slice(0, 2);

  // Title node — centered horizontally above the two path nodes
  const BRANCH_GAP = 80;                             // horizontal gap between path nodes
  const totalPathWidth = 2 * NODE_W + BRANCH_GAP;
  const titleX = 80 + totalPathWidth / 2 - NODE_W / 2;
  const titleNode: SlideNode = {
    id: `gen-title-${ts}`,
    index: 1,
    title: titleChunk.headline,
    kind: "title" as SceneKind,
    status: "draft" as SceneStatus,
    eyebrow: titleChunk.eyebrow,
    body: titleChunk.body,
    x: titleX,
    y: 60,
    ...bucketBase,
  };

  // Path nodes — two branches side by side below the title
  const PATH_Y = 60 + NODE_H + 140;
  const pathNodes: SlideNode[] = pathChunks.map((chunk, i) => ({
    id: `gen-${ts}-path-${i}`,
    index: i + 2,
    title: chunk.headline,
    kind: chunk.kind as SceneKind,
    status: "draft" as SceneStatus,
    eyebrow: chunk.eyebrow,
    body: chunk.body,
    x: 80 + i * (NODE_W + BRANCH_GAP),
    y: PATH_Y,
    ...bucketBase,
  }));

  // Branch edges: title → each path node (type "branch", dashed visual)
  const edges: Edge[] = pathNodes.map((p) => ({
    from: titleNode.id,
    to: p.id,
    type: "branch" as const,
    relation: "sequence" as EdgeRelation,
    dashed: true,
  }));

  const allNodes = [titleNode, ...pathNodes];

  // Extract content nodes from each slide's body text.
  const contentPool: ContentNode[] = allNodes.flatMap((node, idx) => {
    const chunk = idx === 0 ? titleChunk : pathChunks[idx - 1];
    if (!chunk?.body) return [];
    return bodyToContentNodes(chunk.body, node);
  });

  return { nodes: allNodes, edges, contentPool };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function hydrateToSlides(text: string): Promise<HydrateResult> {
  const targetCount = 10;

  let chunks: ChunkResult[];
  let source: HydrateResult["source"];
  let mockReason: string | undefined;
  try {
    chunks = await chunkIntoScenes(text, targetCount);
    source = "gemini";
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[chunker] Gemini unavailable — mock fallback active.\n  Reason:", errMsg);
    chunks = mockChunkIntoScenes(text, targetCount);
    source = "mock";
    mockReason = errMsg;
  }

  const { nodes, edges, contentPool } = buildSlideNodes(chunks);
  return { nodes, edges, contentPool, source, mockReason };
}
