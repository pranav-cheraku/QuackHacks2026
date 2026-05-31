export type ComponentType =
  | "Header"
  | "Subheader"
  | "Body"
  | "Stat"
  | "Quote"
  | "List"
  | "Image"
  | "Chart"
  | "Video"
  | "Divider"
  | "Byline";

export const CONTENT_COMPONENTS: ComponentType[] = [
  "Header",
  "Subheader",
  "Body",
  "Stat",
  "Quote",
  "List",
];
export const MEDIA_COMPONENTS: ComponentType[] = [
  "Image",
  "Chart",
  "Video",
  "Divider",
  "Byline",
];

// --- Graph-view node model -------------------------------------------------
// `kind` drives the card preview + the type label; `status` drives the pill.
export type SceneKind = "title" | "problem" | "data";
export type SceneStatus = "final" | "draft" | "in-review";

// `role` is the scene's narrative job (shown + editable in the Inspect panel).
export type SceneRole = "claim" | "evidence" | "data" | "title";

// A content block on a scene (the slide's "ingredients"). Listed in Inspect's
// "Content blocks"; step 10 will also tether these to the canvas as sub-nodes.
export interface ContentBlock {
  id: string;
  type: ComponentType;
  label: string;
}

// Legacy fields (`state`, `thumb`) are still consumed by the Slides View
// (EditorView / SlideThumb). Kept until that view is reworked.
export type SlideState = "rendered" | "ingredient";

// Slides View (slide editor) — a design alternative for a scene.
export interface SlideCandidate {
  id: string;
  label: string;
  elements: import("./slide-model").SlideElement[];
}

export interface SlideNode {
  id: string;
  index: number;
  title: string;
  kind: SceneKind;
  status: SceneStatus;
  eyebrow?: string;
  body?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  // Graph-view Inspect panel fields (all optional).
  role?: SceneRole;
  locked?: boolean;
  blocks?: ContentBlock[];
  // Ghost (AI-suggested branch) fields. A ghost is a proposed-but-uncommitted
  // scene: Accept promotes it; Discard sets `discarded` (dimmed but revisitable).
  ghost?: boolean;
  discarded?: boolean;
  rationale?: string;
  // legacy — Slides View only
  state: SlideState;
  thumb: "title" | "stats" | "chart" | "list" | "closing";
  // Slides View (slide editor) — element model + design candidates.
  elements: import("./slide-model").SlideElement[];
  candidates: SlideCandidate[];
  activeDesignId: string | null;
}

export type EdgeRelation = "supports" | "contrasts" | "builds-on" | "sequence";

export interface Edge {
  from: string;
  to: string;
  relation?: EdgeRelation;
  dashed?: boolean;
}

export const INITIAL_NODES: SlideNode[] = [
  {
    id: "n1",
    index: 1,
    title: "Logistics that thinks ahead.",
    kind: "title",
    status: "final",
    eyebrow: "SERIES A · 2026",
    body: "Meridian turns fleet telemetry into decisions — before the delay happens.",
    x: 560,
    y: 70,
    width: 340,
    height: 190,
    role: "title",
    locked: false,
    blocks: [
      { id: "n1-b1", type: "Header", label: "Logistics that thinks ahead." },
      { id: "n1-b2", type: "Subheader", label: "Series A · 2026" },
    ],
    state: "rendered",
    thumb: "title",
    elements: [],
    candidates: [],
    activeDesignId: null,
  },
  {
    id: "n2",
    index: 2,
    title: "The problem we avoid",
    kind: "problem",
    status: "draft",
    x: 390,
    y: 370,
    width: 300,
    height: 180,
    role: "claim",
    locked: false,
    blocks: [
      { id: "n2-b1", type: "Body", label: "Reactive logistics burns margin." },
      { id: "n2-b2", type: "List", label: "3 failure modes" },
    ],
    state: "ingredient",
    thumb: "list",
    elements: [],
    candidates: [],
    activeDesignId: null,
  },
  {
    id: "n3",
    index: 3,
    title: "Pipeline → revenue",
    kind: "data",
    status: "in-review",
    x: 760,
    y: 370,
    width: 320,
    height: 180,
    role: "data",
    locked: false,
    blocks: [
      { id: "n3-b1", type: "Stat", label: "+38% on-time delivery" },
      { id: "n3-b2", type: "Chart", label: "Quarterly revenue" },
    ],
    state: "rendered",
    thumb: "chart",
    elements: [],
    candidates: [],
    activeDesignId: null,
  },
];

export const INITIAL_EDGES: Edge[] = [
  { from: "n1", to: "n2", relation: "contrasts" },
  { from: "n1", to: "n3", relation: "supports" },
];
