import type { GridPlacement } from "./grid";
import { SNAP_STEP } from "./grid";

export type ElementType = "text" | "image" | "shape";

export interface TextStyle {
  content: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  textAlign: "left" | "center" | "right";
  color: string;
  fontFamily?: "sans" | "mono" | "serif"; // maps to CSS font var; default: sans
  lineHeight?: number; // multiplier, default 1.4
  letterSpacing?: string; // e.g. "0.25em"
}

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface SlideElement {
  id: string;
  type: ElementType;
  placement: GridPlacement;
  zIndex: number;
  opacity: number;
  rotation: number;
  text?: TextStyle;
  shape?: ShapeStyle;
  src?: string;
}

let _id = 1;
export function nextId() {
  return `el-${Date.now()}-${_id++}`;
}

const CENTER_COL = 2500;
const CENTER_ROW = 1500;
const SPAN4 = SNAP_STEP * 40; // 40% of width
const SPAN2 = SNAP_STEP * 25; // 25% of height

export function makeTextElement(
  overrides?: Partial<SlideElement>,
): SlideElement {
  return {
    id: nextId(),
    type: "text",
    placement: {
      col: CENTER_COL,
      row: CENTER_ROW,
      colSpan: SPAN4,
      rowSpan: SPAN2,
    },
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    text: {
      content: "Click to edit",
      fontSize: 28,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: "oklch(0.24 0.009 185)",
    },
    ...overrides,
  };
}

export function makeShapeElement(
  overrides?: Partial<SlideElement>,
): SlideElement {
  return {
    id: nextId(),
    type: "shape",
    placement: {
      col: CENTER_COL,
      row: CENTER_ROW,
      colSpan: SPAN4,
      rowSpan: SPAN2,
    },
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    shape: {
      fill: "oklch(0.54 0.105 192)",
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 6,
    },
    ...overrides,
  };
}

export function makeImageElement(
  overrides?: Partial<SlideElement>,
): SlideElement {
  return {
    id: nextId(),
    type: "image",
    placement: {
      col: CENTER_COL,
      row: CENTER_ROW,
      colSpan: SPAN4,
      rowSpan: SPAN2 * 2,
    },
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    src: "",
    ...overrides,
  };
}
