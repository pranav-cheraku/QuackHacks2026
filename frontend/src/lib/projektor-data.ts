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

// "bucket"  = raw content from chunker, no slide design yet — lives in graph only.
// "designed" = has a realized layout (elements[]); viewable/editable in slide editor.
// undefined is treated as "designed" for backwards compat with INITIAL_NODES.
export type DesignStatus = "bucket" | "designed";

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
  // Legacy fields consumed by the Slides View until it is reworked
  rotation?: number;
  state?: SlideState;
  thumb?: "title" | "stats" | "chart" | "list" | "closing";
  components?: ComponentType[];
  candidates?: import("./projektor-data").SlideCandidate[];
  activeDesignId?: string | null;
  // "bucket" = raw content from chunker, no design yet.
  // "designed" (or undefined) = has a realized layout in elements[].
  designStatus?: DesignStatus;
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
    width: 280,
    height: 170,
    state: "rendered",
    thumb: "title",
    elements: [],
  },
  {
    id: "n2",
    index: 2,
    title: "By the Numbers",
    kind: "data",
    status: "final",
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
    kind: "problem",
    status: "in-review",
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
    kind: "data",
    status: "draft",
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
    kind: "data",
    status: "draft",
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
    kind: "title",
    status: "draft",
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
