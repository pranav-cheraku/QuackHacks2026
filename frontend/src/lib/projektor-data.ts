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
  elements: import("./slide-model").SlideElement[];
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
    width: 280,
    height: 170,
    elements: [],
  },
  {
    id: "n2",
    index: 2,
    title: "By the Numbers",
    x: 430,
    y: 150,
    rotation: 0.8,
    state: "rendered",
    components: [],
    thumb: "stats",
    width: 280,
    height: 170,
    elements: [],
  },
  {
    id: "n3",
    index: 3,
    title: "Market Landscape",
    x: 800,
    y: 90,
    rotation: -0.6,
    state: "ingredient",
    components: ["Header", "Image", "Body"],
    thumb: "title",
    width: 260,
    height: 220,
    elements: [],
  },
  {
    id: "n4",
    index: 4,
    title: "Growth Trajectory",
    x: 1140,
    y: 200,
    rotation: 1.4,
    state: "rendered",
    thumb: "chart",
    width: 280,
    height: 170,
    elements: [],
  },
  {
    id: "n5",
    index: 5,
    title: "Three Bets for Q4",
    x: 1480,
    y: 110,
    rotation: -0.4,
    state: "rendered",
    components: [],
    thumb: "list",
    width: 280,
    height: 170,
    elements: [],
  },
  {
    id: "n6",
    index: 6,
    title: "Closing",
    x: 1820,
    y: 200,
    rotation: 0.6,
    state: "rendered",
    components: [],
    thumb: "closing",
    width: 280,
    height: 170,
    elements: [],
  },
];

export const INITIAL_EDGES: Edge[] = [
  { from: "n1", to: "n2", relation: "contrasts" },
  { from: "n1", to: "n3", relation: "supports" },
];
