// Types mirroring the Firebase edge function's SlideSpec schema.
// These are the "external" types used as the source format.
// The adapter (spec-to-elements.ts) converts them to SlideElement[].

export type SpecLayout =
  | "full-bleed"
  | "split-left"
  | "split-right"
  | "grid-2"
  | "grid-3"
  | "centered";

export type SpecElementType =
  | "header"
  | "subheader"
  | "body"
  | "quote"
  | "byline"
  | "list"
  | "stat"
  | "image"
  | "chart"
  | "divider";

export interface SpecTheme {
  background: string;
  palette: string[];
  fontFamily: string;
}

export interface SpecTextStyle {
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";
  color?: string;
  fontFamily?: "sans" | "mono" | "serif";
  lineHeight?: number;
  letterSpacing?: string;
}

export interface SpecShapeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface SlideSpecElement {
  id: string;
  type: SpecElementType;
  position: { x: number; y: number }; // 0–100 percentages of slide dimensions
  size: { w: number; h: number };       // 0–100 percentages of slide dimensions
  zIndex: number;
  opacity?: number;
  content?: string;
  style?: SpecTextStyle | SpecShapeStyle;
}

export interface SlideSpec {
  id: string;
  layout: SpecLayout;
  theme: SpecTheme;
  elements: SlideSpecElement[];
}
