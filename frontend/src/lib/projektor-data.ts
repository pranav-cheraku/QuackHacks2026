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

// Legacy fields (`state`, `thumb`) are still consumed by the Slides View
// (EditorView / SlideThumb). Kept until that view is reworked.
export type SlideState = "rendered" | "ingredient";

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
  // legacy — Slides View only
  state: SlideState;
  thumb: "title" | "stats" | "chart" | "list" | "closing";
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
    state: "rendered",
    thumb: "title",
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
    state: "ingredient",
    thumb: "list",
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
    state: "rendered",
    thumb: "chart",
  },
];

export const INITIAL_EDGES: Edge[] = [
  { from: "n1", to: "n2", relation: "contrasts" },
  { from: "n1", to: "n3", relation: "supports" },
];
