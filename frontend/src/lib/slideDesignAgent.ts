// ── SLIDE-DESIGN AGENT ────────────────────────────────────────────────────────
// Triggered when the user double-clicks a content bucket in the graph view.
//
// Input:  one SlideNode (designStatus === "bucket") — title, body, eyebrow, kind
// Output: SlideCandidate[] — each candidate is a complete LayoutNode tree that
//         the slide editor can render, edit, and write back to the shared deck.
//
// SWAP POINT (Gemini): replace mockGenerateCandidates with a real server function.
// Pattern mirrors backend/landing-page/ (createServerFn + proxyHandler).
// When ready:
//   1. Create frontend/src/lib/designCandidatesApi.ts (createServerFn, method POST)
//   2. Create backend/landing-page/designCandidatesHandler.ts + agent
//   3. Replace the body of generateSlideCandidates below with the server call
//
// Contract (stable — both sides must match):
//   POST /api/design-candidates
//   Body:     { nodeId, headline, body?, kind, eyebrow? }
//   Response: { candidates: [{ id, label, leaves: LeafNodeSpec[] }] }
//   Client converts leaves → LayoutNode via buildRoot() below.

import type { SlideNode, SlideCandidate } from "./projektor-data";
import type { LeafNode, LayoutNode } from "./ir";
import { makeLeafId, emptyRoot } from "./ir";

const TEAL  = "oklch(0.54 0.105 192)";
const INK   = "oklch(0.24 0.009 185)";
const MUTED = "oklch(0.53 0.011 185)";

// Wraps a flat list of LeafNodes in a StackNode root so EditorView can render it.
function buildRoot(nodeId: string, suffix: string, leaves: LeafNode[]): LayoutNode {
  return { ...emptyRoot(`${nodeId}-${suffix}`), children: leaves };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateSlideCandidates(node: SlideNode): Promise<SlideCandidate[]> {
  // SWAP POINT: uncomment and implement when backend agent is ready.
  // const result = await designCandidatesApi({ data: {
  //   nodeId: node.id, headline: node.title, body: node.body,
  //   kind: node.kind, eyebrow: node.eyebrow,
  // }});
  // return result.candidates.map(c => ({
  //   id: c.id, label: c.label,
  //   root: buildRoot(node.id, c.id, c.leaves as LeafNode[]),
  // }));
  return mockGenerateCandidates(node);
}

// ── Mock: two deterministic layout variants ───────────────────────────────────
// Stable output (no randomness) so previews don't flicker on re-open.
function mockGenerateCandidates(node: SlideNode): SlideCandidate[] {
  const { id, title: headline, body = "", eyebrow } = node;

  // ── Variant A: Left-aligned editorial ────────────────────────────────────
  const leftLeaves: LeafNode[] = [
    ...(eyebrow ? [{
      kind: "leaf" as const, id: makeLeafId(), zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: 400, colSpan: 9000, rowSpan: 350 },
      block: {
        role: "text" as const, text: eyebrow,
        style: {
          fontSize: 11, fontWeight: 700, fontStyle: "normal" as const,
          textDecoration: "none" as const, textAlign: "left" as const,
          color: TEAL, fontFamily: "mono" as const, letterSpacing: "0.25em",
        },
      },
    }] : []),
    {
      kind: "leaf", id: makeLeafId(), zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: eyebrow ? 900 : 700, colSpan: 9000, rowSpan: 1500 },
      block: {
        role: "text", text: headline,
        style: {
          fontSize: 48, fontWeight: 800, fontStyle: "normal",
          textDecoration: "none", textAlign: "left", color: INK, lineHeight: 1.1,
        },
      },
    },
    ...(body ? [{
      kind: "leaf" as const, id: makeLeafId(), zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: eyebrow ? 2600 : 2400, colSpan: 9000, rowSpan: 2700 },
      block: {
        role: "text" as const, text: body,
        style: {
          fontSize: 20, fontWeight: 400, fontStyle: "normal" as const,
          textDecoration: "none" as const, textAlign: "left" as const,
          color: MUTED, lineHeight: 1.5,
        },
      },
    }] : []),
  ];

  // ── Variant B: Centered with teal accent bar ──────────────────────────────
  const centeredLeaves: LeafNode[] = [
    {
      kind: "leaf", id: makeLeafId(), zIndex: 0, opacity: 1, rotation: 0,
      placement: { col: 4700, row: 300, colSpan: 600, rowSpan: 60 },
      block: {
        role: "shape",
        style: { fill: TEAL, stroke: "transparent", strokeWidth: 0, borderRadius: 4 },
      },
    },
    ...(eyebrow ? [{
      kind: "leaf" as const, id: makeLeafId(), zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: 500, colSpan: 9000, rowSpan: 350 },
      block: {
        role: "text" as const, text: eyebrow,
        style: {
          fontSize: 11, fontWeight: 700, fontStyle: "normal" as const,
          textDecoration: "none" as const, textAlign: "center" as const,
          color: TEAL, fontFamily: "mono" as const, letterSpacing: "0.25em",
        },
      },
    }] : []),
    {
      kind: "leaf", id: makeLeafId(), zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 500, row: eyebrow ? 1000 : 800, colSpan: 9000, rowSpan: 1800 },
      block: {
        role: "text", text: headline,
        style: {
          fontSize: 52, fontWeight: 800, fontStyle: "normal",
          textDecoration: "none", textAlign: "center", color: INK, lineHeight: 1.05,
        },
      },
    },
    ...(body ? [{
      kind: "leaf" as const, id: makeLeafId(), zIndex: 1, opacity: 1, rotation: 0,
      placement: { col: 1500, row: eyebrow ? 3000 : 2800, colSpan: 7000, rowSpan: 2200 },
      block: {
        role: "text" as const, text: body,
        style: {
          fontSize: 18, fontWeight: 400, fontStyle: "normal" as const,
          textDecoration: "none" as const, textAlign: "center" as const,
          color: MUTED, lineHeight: 1.5,
        },
      },
    }] : []),
  ];

  return [
    { id: `${id}-cand-left`,   label: "Left-aligned", root: buildRoot(id, "left",   leftLeaves) },
    { id: `${id}-cand-center`, label: "Centered",     root: buildRoot(id, "center", centeredLeaves) },
  ];
}
