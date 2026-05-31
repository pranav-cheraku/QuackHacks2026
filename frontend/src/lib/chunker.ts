// ── Deck generation pipeline ───────────────────────────────────────────────────
// Entry point: hydrateToSlides(text, duration) → SlideNode[]
// The pipeline is:
//   durationToSlideCount → chunkIntoScenes (LLM SWAP POINT) → buildSlideNodes
//
// chunkIntoScenes calls chunkDeck (a TanStack Start server function) which proxies
// to Gemini server-side — GEMINI_API_KEY never reaches the browser.
// If the server function fails, mockChunkIntoScenes provides a graceful fallback.

import type { SlideNode, SceneKind, SceneStatus, SlideState } from "./projektor-data";
import { nextId } from "./slide-model";
import { chunkDeck } from "./chunkApi";

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

// ── Hydration ─────────────────────────────────────────────────────────────────
// Maps ChunkResult[] → valid SlideNode[] conforming to the IR model.
// Coordinate-bound elements match the 10 000 × 5 625 grid; SNAP_STEP = 100.

const TEAL = "oklch(0.54 0.105 192)";
const INK = "oklch(0.24 0.009 185)";
const MUTED = "oklch(0.53 0.011 185)";

function buildSlideNodes(chunks: ChunkResult[]): SlideNode[] {
  const COLS_PER_ROW = 4;
  const COL_W = 360;
  const ROW_H = 240;

  return chunks.map((chunk, i) => {
    const id = `gen-${Date.now()}-${i}`;
    const hasEyebrow = Boolean(chunk.eyebrow);
    const headlineRow = hasEyebrow ? 900 : 700;
    const bodyRow = hasEyebrow ? 2600 : 2400;

    const elements = [
      // Eyebrow label (optional)
      ...(hasEyebrow
        ? [
            {
              id: nextId(),
              type: "text" as const,
              zIndex: 1,
              opacity: 1,
              rotation: 0,
              placement: { col: 500, row: 400, colSpan: 9000, rowSpan: 350 },
              text: {
                content: chunk.eyebrow!,
                fontSize: 11,
                fontWeight: 700,
                fontStyle: "normal" as const,
                textDecoration: "none" as const,
                textAlign: "left" as const,
                color: TEAL,
                fontFamily: "mono" as const,
                letterSpacing: "0.25em",
              },
            },
          ]
        : []),
      // Headline
      {
        id: nextId(),
        type: "text" as const,
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        placement: { col: 500, row: headlineRow, colSpan: 9000, rowSpan: 1500 },
        text: {
          content: chunk.headline,
          fontSize: 48,
          fontWeight: 800,
          fontStyle: "normal" as const,
          textDecoration: "none" as const,
          textAlign: "left" as const,
          color: INK,
          lineHeight: 1.1,
        },
      },
      // Body
      ...(chunk.body
        ? [
            {
              id: nextId(),
              type: "text" as const,
              zIndex: 1,
              opacity: 1,
              rotation: 0,
              placement: { col: 500, row: bodyRow, colSpan: 9000, rowSpan: 2700 },
              text: {
                content: chunk.body,
                fontSize: 20,
                fontWeight: 400,
                fontStyle: "normal" as const,
                textDecoration: "none" as const,
                textAlign: "left" as const,
                color: MUTED,
                lineHeight: 1.5,
              },
            },
          ]
        : []),
    ];

    // Board position: lay out in a 4-column grid so the graph view looks tidy
    const col = i % COLS_PER_ROW;
    const row = Math.floor(i / COLS_PER_ROW);

    return {
      id,
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
      thumb: "list" as const,
      elements,
      candidates: [],
      activeDesignId: null,
    };
  });
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function hydrateToSlides(
  text: string,
  duration: TargetDuration,
): Promise<SlideNode[]> {
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
