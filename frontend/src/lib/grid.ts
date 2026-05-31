// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  PROJEKTOR COORDINATE GRID — single source of truth                     ║
// ║  All tunable values live here. Touch nothing else to change the grid.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Grid resolution ───────────────────────────────────────────────────────────
// 10 000 × 5 625 keeps exact 16:9 proportionality (10000 / 5625 = 1.777… = 16/9).
// Each unit = 0.01% of the slide dimension (1 unit = 1‱ of width or height).
// Full slide = col 0..10000, row 0..5625.
export const GRID_COLS = 10_000;
export const GRID_ROWS =  5_625;

// ── PowerPoint / EMU export ───────────────────────────────────────────────────
// Standard 16:9 slide = 12 192 000 × 6 858 000 EMU.
// 12_192_000 / 10_000 = 1219.2  (same factor for height: 6_858_000 / 5_625 = 1219.2)
// To convert a grid coordinate to EMU for .pptx: multiply by UNITS_TO_EMU.
export const UNITS_TO_EMU = 1219.2;

// ── Canonical slide dimensions (pixels at 1× zoom) ───────────────────────────
export const SLIDE_W = 928; // px
export const SLIDE_H = 522; // px

// ── Drag snapping ─────────────────────────────────────────────────────────────
// Dragged elements snap to the nearest multiple of SNAP_STEP grid units.
// 100 units = 1% of slide width. Increase for coarser feel, decrease for finer.
// Does NOT change the underlying coordinate precision — just the drag UX.
export const SNAP_STEP = 100; // 1% increments by default

// ── Debug overlay visual density (independent of grid resolution) ─────────────
// The overlay draws OVERLAY_COLS × OVERLAY_ROWS guide lines, NOT one per grid unit.
// 40 × 22 ≈ 16:9, giving ~2.5% × ~4.5% cells — fine but still readable.
export const OVERLAY_COLS = 40;
export const OVERLAY_ROWS = 22;
// Every Nth minor line is rendered as a major (brighter) line.
export const OVERLAY_MAJOR_EVERY = 4; // major line every 4 minor = every 10% width

// ─────────────────────────────────────────────────────────────────────────────

// ── Core types ────────────────────────────────────────────────────────────────

/** What Gemini emits. Every placeable element on a slide carries one of these. */
export interface GridPlacement {
  col:     number; // 0-indexed left edge   (0 = left margin, GRID_COLS = right edge)
  row:     number; // 0-indexed top edge    (0 = top,  GRID_ROWS = bottom edge)
  colSpan: number; // width  in grid units  (>= 1; practical minimum: SNAP_STEP)
  rowSpan: number; // height in grid units  (>= 1; practical minimum: SNAP_STEP)
}

/** CSS properties the renderer applies to a positioned element. */
export interface CSSPlacement {
  position: "absolute";
  left:   string; // percentage
  top:    string; // percentage
  width:  string; // percentage
  height: string; // percentage
}

// ── Forward resolver: grid → CSS ──────────────────────────────────────────────

/**
 * Convert a GridPlacement to percentage-based absolute CSS.
 * Resolution-independent: works at any zoom level or export size.
 */
export function gridToCSS(p: GridPlacement): CSSPlacement {
  return {
    position: "absolute",
    left:   pct(p.col,     GRID_COLS),
    top:    pct(p.row,     GRID_ROWS),
    width:  pct(p.colSpan, GRID_COLS),
    height: pct(p.rowSpan, GRID_ROWS),
  };
}

function pct(units: number, max: number): string {
  return `${((units / max) * 100).toFixed(4)}%`;
}

// ── EMU export helper ─────────────────────────────────────────────────────────

/** Convert a GridPlacement to EMU values for direct .pptx XML output. */
export interface EmuPlacement {
  x:   number; // EMU from left
  y:   number; // EMU from top
  cx:  number; // EMU width
  cy:  number; // EMU height
}

export function gridToEmu(p: GridPlacement): EmuPlacement {
  return {
    x:  Math.round(p.col     * UNITS_TO_EMU),
    y:  Math.round(p.row     * UNITS_TO_EMU),
    cx: Math.round(p.colSpan * UNITS_TO_EMU),
    cy: Math.round(p.rowSpan * UNITS_TO_EMU),
  };
}

// ── Snapping helper ───────────────────────────────────────────────────────────

/**
 * Round a raw grid value to the nearest snap increment.
 * Called internally by the reverse resolver; also usable standalone.
 */
export function snap(value: number, step: number = SNAP_STEP): number {
  return Math.round(value / step) * step;
}

// ── Reverse resolver: pixels → grid (with snapping) ──────────────────────────

/**
 * Convert a pixel position to the nearest snapped grid coordinate.
 * Uses the rendered slide dimensions so it scales at any zoom level.
 *
 * @param applySnap  Set false to get the raw (un-snapped) fine value.
 */
export function pixelsToGrid(
  x: number,
  y: number,
  slideWidth:  number = SLIDE_W,
  slideHeight: number = SLIDE_H,
  applySnap = true,
): { col: number; row: number } {
  const rawCol = (x / slideWidth)  * GRID_COLS;
  const rawRow = (y / slideHeight) * GRID_ROWS;
  const col = applySnap ? snap(rawCol) : rawCol;
  const row = applySnap ? snap(rawRow) : rawRow;
  return {
    col: Math.max(0, Math.min(GRID_COLS, Math.round(col))),
    row: Math.max(0, Math.min(GRID_ROWS, Math.round(row))),
  };
}

/**
 * Derive a full GridPlacement from a drag rect (two pixel corners).
 * Handles any drag direction; guarantees colSpan and rowSpan >= SNAP_STEP.
 */
export function pixelRectToPlacement(
  x1: number, y1: number,
  x2: number, y2: number,
  slideWidth:  number = SLIDE_W,
  slideHeight: number = SLIDE_H,
): GridPlacement {
  const tl = pixelsToGrid(Math.min(x1, x2), Math.min(y1, y2), slideWidth, slideHeight);
  const br = pixelsToGrid(Math.max(x1, x2), Math.max(y1, y2), slideWidth, slideHeight);
  return {
    col:     tl.col,
    row:     tl.row,
    colSpan: Math.max(SNAP_STEP, br.col - tl.col),
    rowSpan: Math.max(SNAP_STEP, br.row - tl.row),
  };
}

// ── Validator ─────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid:     boolean;
  errors:    string[];
  /** Always returned — the original if valid, a clamped version if not. */
  placement: GridPlacement;
}

/**
 * Validate a placement from Gemini before applying it to the slide.
 *
 * On invalid input: returns valid=false, a list of errors, and a clamped
 * fallback placement. Caller decides whether to apply the clamp or reject.
 * Recommended default: apply the clamp and log the errors for review.
 */
export function validatePlacement(p: GridPlacement): ValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(p.col)     || p.col     < 0)          errors.push(`col must be >= 0 (got ${p.col})`);
  if (!Number.isFinite(p.row)     || p.row     < 0)          errors.push(`row must be >= 0 (got ${p.row})`);
  if (!Number.isFinite(p.colSpan) || p.colSpan < 1)          errors.push(`colSpan must be >= 1 (got ${p.colSpan})`);
  if (!Number.isFinite(p.rowSpan) || p.rowSpan < 1)          errors.push(`rowSpan must be >= 1 (got ${p.rowSpan})`);
  if (p.col + p.colSpan > GRID_COLS) errors.push(`col(${p.col}) + colSpan(${p.colSpan}) = ${p.col + p.colSpan} exceeds GRID_COLS(${GRID_COLS})`);
  if (p.row + p.rowSpan > GRID_ROWS) errors.push(`row(${p.row}) + rowSpan(${p.rowSpan}) = ${p.row + p.rowSpan} exceeds GRID_ROWS(${GRID_ROWS})`);

  if (errors.length === 0) return { valid: true, errors: [], placement: p };

  // Build clamped fallback
  const col     = Math.max(0, Math.min(GRID_COLS - 1, Math.round(p.col     ?? 0)));
  const row     = Math.max(0, Math.min(GRID_ROWS - 1, Math.round(p.row     ?? 0)));
  const colSpan = Math.max(1, Math.min(GRID_COLS - col, Math.round(p.colSpan ?? SNAP_STEP)));
  const rowSpan = Math.max(1, Math.min(GRID_ROWS - row, Math.round(p.rowSpan ?? SNAP_STEP)));

  return { valid: false, errors, placement: { col, row, colSpan, rowSpan } };
}

// ── Gemini system-prompt fragment ─────────────────────────────────────────────
// Inject GEMINI_GRID_PROMPT into Gemini's system prompt so it knows the grid.
export const GEMINI_GRID_PROMPT = `
Slide layout uses a fine-grained coordinate grid: ${GRID_COLS} units wide × ${GRID_ROWS} units tall (16:9 ratio).
Origin (0, 0) is the top-left corner. Right edge = ${GRID_COLS}. Bottom edge = ${GRID_ROWS}.
Each unit = 0.01% of the slide dimension. Snap step = ${SNAP_STEP} units (1%).

Every element you place must include a "placement" field:
  { "col": <0–${GRID_COLS}>, "row": <0–${GRID_ROWS}>, "colSpan": <1–${GRID_COLS}>, "rowSpan": <1–${GRID_ROWS}> }

Rules:
  - col + colSpan must not exceed ${GRID_COLS}
  - row + rowSpan must not exceed ${GRID_ROWS}
  - Prefer multiples of ${SNAP_STEP} (1%) for clean alignment
  - Values are numbers (decimals allowed, but integers preferred)

Common reference points:
  - Horizontal center: col ${GRID_COLS / 2} (= 50%)
  - Vertical center:   row ${GRID_ROWS / 2} (= 50%)
  - Full width:  colSpan ${GRID_COLS}
  - Full height: rowSpan ${GRID_ROWS}

Examples:
  Full-width headline (top 20%):     { "col": 0,    "row": 0,    "colSpan": ${GRID_COLS},     "rowSpan": ${GRID_ROWS * 0.2} }
  Right-half image (full height):    { "col": 5000, "row": 0,    "colSpan": 5000,             "rowSpan": ${GRID_ROWS} }
  Centered logo (middle 40%×20%):    { "col": 3000, "row": 2250, "colSpan": 4000,             "rowSpan": 1125 }
  Small caption (bottom-right 25%):  { "col": 7500, "row": 4500, "colSpan": 2500,             "rowSpan": 1125 }
`.trim();
