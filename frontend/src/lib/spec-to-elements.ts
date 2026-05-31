// Adapter: converts a SlideSpec (edge function schema) into SlideElement[]
// (the internal editor model). This is the only file that imports from both
// slide-spec.ts and slide-model.ts.

import { GRID_COLS, GRID_ROWS } from "./grid";
import type { SlideElement, TextStyle, ShapeStyle } from "./slide-model";
import type {
  SlideSpec,
  SlideSpecElement,
  SpecTextStyle,
  SpecShapeStyle,
} from "./slide-spec";

// Color constants — shared with mock-slide-specs.ts intentionally to keep
// the semantic defaults visually consistent with the fixture data.
const TEAL  = "oklch(0.54 0.105 192)";
const INK   = "oklch(0.24 0.009 185)";
const MUTED = "oklch(0.53 0.011 185)";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert a SlideSpec into the SlideElement[] the editor renderer expects.
 * Optionally injects a full-slide background shape when the theme specifies
 * a non-white background.
 */
export function specToElements(spec: SlideSpec): SlideElement[] {
  const elements: SlideElement[] = [];

  // Background shape — only when theme sets a non-white background
  const bg = spec.theme.background.trim().toLowerCase();
  if (bg && bg !== "#ffffff" && bg !== "white" && bg !== "rgb(255,255,255)") {
    elements.push({
      id: `${spec.id}-bg`,
      type: "shape",
      placement: { col: 0, row: 0, colSpan: GRID_COLS, rowSpan: GRID_ROWS },
      zIndex: 0,
      opacity: 1,
      rotation: 0,
      shape: { fill: spec.theme.background, stroke: "transparent", strokeWidth: 0, borderRadius: 0 },
    });
  }

  for (const el of spec.elements) {
    elements.push(convertElement(el));
  }

  return elements;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function pctToGrid(pct: number, max: number): number {
  return Math.round((pct / 100) * max);
}

const TEXT_TYPES = new Set([
  "header", "subheader", "body", "quote", "byline", "list", "stat",
]);

function convertElement(el: SlideSpecElement): SlideElement {
  const placement = {
    col:     pctToGrid(el.position.x, GRID_COLS),
    row:     pctToGrid(el.position.y, GRID_ROWS),
    colSpan: pctToGrid(el.size.w,     GRID_COLS),
    rowSpan: pctToGrid(el.size.h,     GRID_ROWS),
  };

  const base = {
    id:       el.id,
    placement,
    zIndex:   el.zIndex,
    opacity:  el.opacity ?? 1,
    rotation: 0,
  };

  if (TEXT_TYPES.has(el.type)) {
    return { ...base, type: "text", text: buildTextStyle(el) };
  }

  if (el.type === "divider") {
    const s = (el.style ?? {}) as SpecShapeStyle;
    const shape: ShapeStyle = {
      fill:         s.fill         ?? TEAL,
      stroke:       s.stroke       ?? "transparent",
      strokeWidth:  s.strokeWidth  ?? 0,
      borderRadius: s.borderRadius ?? 0,
    };
    return { ...base, type: "shape", shape };
  }

  // image / chart
  return { ...base, type: "image", src: el.content ?? "" };
}

function buildTextStyle(el: SlideSpecElement): TextStyle {
  const defaults = semanticDefaults(el.type);
  const s = (el.style ?? {}) as SpecTextStyle;
  return {
    content:        el.content          ?? "",
    fontSize:       s.fontSize          ?? defaults.fontSize,
    fontWeight:     s.fontWeight        ?? defaults.fontWeight,
    fontStyle:      s.fontStyle         ?? "normal",
    textDecoration: s.textDecoration    ?? "none",
    textAlign:      s.textAlign         ?? defaults.textAlign,
    color:          s.color             ?? defaults.color,
    fontFamily:     s.fontFamily        ?? defaults.fontFamily,
    lineHeight:     s.lineHeight        ?? defaults.lineHeight,
    letterSpacing:  s.letterSpacing,
  };
}

interface SemanticDefaults {
  fontSize:   number;
  fontWeight: number;
  textAlign:  "left" | "center" | "right";
  color:      string;
  fontFamily?: "sans" | "mono" | "serif";
  lineHeight?: number;
}

function semanticDefaults(type: string): SemanticDefaults {
  switch (type) {
    case "header":    return { fontSize: 60, fontWeight: 800, textAlign: "left",   color: INK,   fontFamily: "sans", lineHeight: 0.95 };
    case "subheader": return { fontSize: 28, fontWeight: 600, textAlign: "left",   color: INK,   fontFamily: "sans", lineHeight: 1.2  };
    case "body":      return { fontSize: 18, fontWeight: 400, textAlign: "left",   color: MUTED, fontFamily: "sans", lineHeight: 1.4  };
    case "quote":     return { fontSize: 22, fontWeight: 400, textAlign: "center", color: INK,   fontFamily: "serif",lineHeight: 1.4  };
    case "byline":    return { fontSize: 12, fontWeight: 400, textAlign: "left",   color: MUTED, fontFamily: "mono", lineHeight: 1.3  };
    case "list":      return { fontSize: 18, fontWeight: 600, textAlign: "left",   color: INK,   fontFamily: "sans", lineHeight: 1.3  };
    case "stat":      return { fontSize: 48, fontWeight: 800, textAlign: "left",   color: TEAL,  fontFamily: "sans", lineHeight: 1.0  };
    default:          return { fontSize: 16, fontWeight: 400, textAlign: "left",   color: INK,   fontFamily: "sans", lineHeight: 1.4  };
  }
}
