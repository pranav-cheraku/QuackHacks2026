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

export type SlideState = "rendered" | "ingredient";

export interface SlideNode {
  id: string;
  index: number;
  title: string;
  x: number;
  y: number;
  rotation: number;
  state: SlideState;
  components: ComponentType[];
  thumb: "title" | "stats" | "chart" | "list" | "closing";
  width?: number;
  height?: number;
}

export interface Edge {
  from: string;
  to: string;
  dashed?: boolean;
}

export interface Variant {
  id: string;
  parentId: string;
  x: number;
  y: number;
  rotation: number;
  layout: "stacked" | "split" | "centered";
  chosen?: boolean;
}

export const INITIAL_NODES: SlideNode[] = [
  {
    id: "n1",
    index: 1,
    title: "Title",
    x: 80,
    y: 80,
    rotation: -1.2,
    state: "rendered",
    components: [],
    thumb: "title",
    width: 280,
    height: 170,
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
  },
  {
    id: "n4",
    index: 4,
    title: "Growth Trajectory",
    x: 1140,
    y: 200,
    rotation: 1.4,
    state: "rendered",
    components: [],
    thumb: "chart",
    width: 280,
    height: 170,
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
  },
];

export const INITIAL_EDGES: Edge[] = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n3", to: "n4" },
  { from: "n4", to: "n5" },
  { from: "n5", to: "n6" },
];

export const INITIAL_VARIANTS: Variant[] = [
  {
    id: "v1",
    parentId: "n3",
    x: 720,
    y: 410,
    rotation: -2,
    layout: "stacked",
    chosen: false,
  },
  {
    id: "v2",
    parentId: "n3",
    x: 880,
    y: 450,
    rotation: 1.2,
    layout: "centered",
    chosen: true,
  },
  {
    id: "v3",
    parentId: "n3",
    x: 1040,
    y: 420,
    rotation: -0.8,
    layout: "split",
    chosen: false,
  },
];
