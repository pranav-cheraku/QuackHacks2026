// ── SLIDE-DESIGN AGENT ────────────────────────────────────────────────────────
// Swap point (b): bucket double-click → N slide-design candidates.
//
// Input:  one raw SlideNode (designStatus === "bucket") — headline, body, kind, eyebrow
// Output: SlideCandidate[] — each candidate is a complete element layout for that scene
//
// SWAP POINT: replace generateSlideCandidates with a real Gemini call.
// Pattern mirrors backend/landing-page/ (chunkingAgent.ts + proxyHandler.ts).
// Real agent contract:
//   POST /api/design-candidates
//   Body: { nodeId: string; headline: string; body?: string; kind: SceneKind; eyebrow?: string }
//   Response: { candidates: [{ label: string; elements: SlideElement[] }] }
// Mock is deterministic (no randomness) so previews are stable on re-open.

import type { SlideNode, SlideCandidate } from "./projektor-data";
import type { SlideElement } from "./slide-model";
import { nextId } from "./slide-model";

const TEAL = "oklch(0.54 0.105 192)";
const INK  = "oklch(0.24 0.009 185)";
const MUTED = "oklch(0.53 0.011 185)";

export async function generateSlideCandidates(node: SlideNode): Promise<SlideCandidate[]> {
  // SWAP POINT: replace this with a real server function call when the backend agent is ready.
  // await fetch('/api/design-candidates', { method: 'POST', body: JSON.stringify({ ... }) })
  return mockGenerateCandidates(node);
}

// ── Mock: two deterministic layout variants ───────────────────────────────────
function mockGenerateCandidates(node: SlideNode): SlideCandidate[] {
  const { title: headline, body = "", eyebrow } = node;

  // Variant A — Left-aligned editorial
  const leftAligned: SlideElement[] = [
    ...(eyebrow ? [{
      id: nextId(), type: "text" as const, zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: 400, colSpan: 9000, rowSpan: 350 },
      text: { content: eyebrow, fontSize: 11, fontWeight: 700, fontStyle: "normal" as const,
        textDecoration: "none" as const, textAlign: "left" as const, color: TEAL,
        fontFamily: "mono" as const, letterSpacing: "0.25em" },
    }] : []),
    {
      id: nextId(), type: "text", zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: eyebrow ? 900 : 700, colSpan: 9000, rowSpan: 1500 },
      text: { content: headline, fontSize: 48, fontWeight: 800, fontStyle: "normal",
        textDecoration: "none", textAlign: "left", color: INK, lineHeight: 1.1 },
    },
    ...(body ? [{
      id: nextId(), type: "text" as const, zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: eyebrow ? 2600 : 2400, colSpan: 9000, rowSpan: 2700 },
      text: { content: body, fontSize: 20, fontWeight: 400, fontStyle: "normal" as const,
        textDecoration: "none" as const, textAlign: "left" as const, color: MUTED, lineHeight: 1.5 },
    }] : []),
  ];

  // Variant B — Centered with teal rule
  const centered: SlideElement[] = [
    {
      id: nextId(), type: "shape", zIndex: 0, opacity: 1, rotation: 0,
      placement: { col: 4700, row: 300, colSpan: 600, rowSpan: 60 },
      shape: { fill: TEAL, stroke: "transparent", strokeWidth: 0, borderRadius: 4 },
    },
    ...(eyebrow ? [{
      id: nextId(), type: "text" as const, zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: 500, colSpan: 9000, rowSpan: 350 },
      text: { content: eyebrow, fontSize: 11, fontWeight: 700, fontStyle: "normal" as const,
        textDecoration: "none" as const, textAlign: "center" as const, color: TEAL,
        fontFamily: "mono" as const, letterSpacing: "0.25em" },
    }] : []),
    {
      id: nextId(), type: "text", zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: eyebrow ? 1000 : 800, colSpan: 9000, rowSpan: 1800 },
      text: { content: headline, fontSize: 52, fontWeight: 800, fontStyle: "normal",
        textDecoration: "none", textAlign: "center", color: INK, lineHeight: 1.05 },
    },
    ...(body ? [{
      id: nextId(), type: "text" as const, zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 1500, row: eyebrow ? 3000 : 2800, colSpan: 7000, rowSpan: 2200 },
      text: { content: body, fontSize: 18, fontWeight: 400, fontStyle: "normal" as const,
        textDecoration: "none" as const, textAlign: "center" as const, color: MUTED, lineHeight: 1.5 },
    }] : []),
  ];

  return [
    { id: `${node.id}-cand-left`, label: "Left-aligned", elements: leftAligned },
    { id: `${node.id}-cand-center`, label: "Centered", elements: centered },
  ];
}
