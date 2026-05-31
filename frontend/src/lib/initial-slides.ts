// Pre-built element data that replaces the hardcoded JSX slide templates.
// Every element uses the 10 000 × 5 625 grid coordinate system.
// Positions were derived from the original Tailwind layout (p-12 = 48px ≈ 500 grid units).
//
// After this is loaded, SlideThumb and CanvasElement render purely from elements[].
// The static JSX templates in EditorView / SlideThumb are no longer used.

import type { SlideElement } from "./slide-model";

const TEAL = "oklch(0.54 0.105 192)";
const TEAL_LIGHT = "oklch(0.85 0.02 192)";
const INK = "oklch(0.24 0.009 185)";
const MUTED = "oklch(0.53 0.011 185)";
const BLUE = "oklch(0.55 0.1 250)";

let uid = 100;
const id = () => `init-${uid++}`;

// ── Slide 1: Title ────────────────────────────────────────────────────────────
// Original: teal right bar, "Q3 · FY26" eyebrow, "Strategy Review" headline,
//           subtitle paragraph, avatar chip + byline
export const slide1Elements: SlideElement[] = [
  // Teal accent bar (right edge, full height)
  {
    id: id(),
    type: "shape",
    zIndex: 0,
    opacity: 1,
    rotation: 0,
    placement: { col: 9500, row: 0, colSpan: 500, rowSpan: 5625 },
    shape: {
      fill: TEAL,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 0,
    },
  },
  // Eyebrow "Q3 · FY26"
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 500, colSpan: 2500, rowSpan: 350 },
    text: {
      content: "Q3 · FY26",
      fontSize: 12,
      fontWeight: 700,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: TEAL,
      fontFamily: "mono",
      letterSpacing: "0.25em",
    },
  },
  // Main headline
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 1100, colSpan: 8700, rowSpan: 2000 },
    text: {
      content: "Strategy\nReview",
      fontSize: 72,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: INK,
      lineHeight: 0.95,
    },
  },
  // Subtitle
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 3300, colSpan: 7000, rowSpan: 900 },
    text: {
      content:
        "Aligning Q4 priorities across product, sales, and operations — what's working, what's next.",
      fontSize: 18,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      lineHeight: 1.4,
    },
  },
  // Avatar circle
  {
    id: id(),
    type: "shape",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 4600, colSpan: 430, rowSpan: 430 },
    shape: {
      fill: BLUE,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 999,
    },
  },
  // Avatar initials
  {
    id: id(),
    type: "text",
    zIndex: 2,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 4600, colSpan: 430, rowSpan: 430 },
    text: {
      content: "AK",
      fontSize: 12,
      fontWeight: 700,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: "white",
    },
  },
  // Name
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 1100, row: 4600, colSpan: 3000, rowSpan: 350 },
    text: {
      content: "Avery Kim",
      fontSize: 13,
      fontWeight: 700,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: INK,
    },
  },
  // Role
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 1100, row: 4950, colSpan: 3000, rowSpan: 350 },
    text: {
      content: "Head of Strategy",
      fontSize: 11,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
    },
  },
];

// ── Slide 2: Stats "By the Numbers" ──────────────────────────────────────────
// Original: section label + 3-column stat grid (+18% / 2.4M / 94%)
export const slide2Elements: SlideElement[] = [
  // Section label
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 500, colSpan: 4000, rowSpan: 350 },
    text: {
      content: "By the Numbers",
      fontSize: 11,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
      letterSpacing: "0.05em",
    },
  },
  // Stat 1 — number
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 200, row: 1600, colSpan: 3000, rowSpan: 1100 },
    text: {
      content: "+18%",
      fontSize: 48,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: TEAL,
      lineHeight: 1,
    },
  },
  // Stat 1 — label
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 200, row: 2800, colSpan: 3000, rowSpan: 400 },
    text: {
      content: "YOY GROWTH",
      fontSize: 10,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
      letterSpacing: "0.05em",
    },
  },
  // Stat 2 — number
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 3700, row: 1600, colSpan: 3000, rowSpan: 1100 },
    text: {
      content: "2.4M",
      fontSize: 48,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: TEAL,
      lineHeight: 1,
    },
  },
  // Stat 2 — label
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 3700, row: 2800, colSpan: 3000, rowSpan: 400 },
    text: {
      content: "ACTIVE USERS",
      fontSize: 10,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
      letterSpacing: "0.05em",
    },
  },
  // Stat 3 — number
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 7200, row: 1600, colSpan: 2600, rowSpan: 1100 },
    text: {
      content: "94%",
      fontSize: 48,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: TEAL,
      lineHeight: 1,
    },
  },
  // Stat 3 — label
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 7200, row: 2800, colSpan: 2600, rowSpan: 400 },
    text: {
      content: "RETENTION",
      fontSize: 10,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
      letterSpacing: "0.05em",
    },
  },
];

// ── Slide 3: Market Landscape (ingredient — stays blank) ──────────────────────
export const slide3Elements: SlideElement[] = [
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 500, colSpan: 5000, rowSpan: 500 },
    text: {
      content: "Market Landscape",
      fontSize: 14,
      fontWeight: 600,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
    },
  },
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 0.45,
    rotation: 0,
    placement: { col: 2000, row: 2000, colSpan: 6000, rowSpan: 1500 },
    text: {
      content: "Content to be added",
      fontSize: 24,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: MUTED,
    },
  },
];

// ── Slide 4: Growth Trajectory (bar chart) ────────────────────────────────────
// 8 bars, bottom-aligned. Chart area: cols 500–9400, rows 1000–5200.
// chartBottom=5200, chartHeight=4200
const chartBottom = 5200;
const chartH = 4200;
const barW = 1000;
const gap = 80;
const barPcts = [28, 42, 38, 55, 61, 72, 68, 84];

export const slide4Elements: SlideElement[] = [
  // Section label
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 500, colSpan: 5000, rowSpan: 350 },
    text: {
      content: "Growth Trajectory",
      fontSize: 11,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
    },
  },
  // 8 chart bars
  ...barPcts.map((pct, i) => {
    const barHeight = Math.round((pct / 100) * chartH);
    const colStart = 500 + i * (barW + gap);
    const rowStart = chartBottom - barHeight;
    return {
      id: id(),
      type: "shape" as const,
      zIndex: 1,
      opacity: 1,
      rotation: 0,
      placement: {
        col: colStart,
        row: rowStart,
        colSpan: barW,
        rowSpan: barHeight,
      },
      shape: {
        fill: i > 4 ? TEAL : TEAL_LIGHT,
        stroke: "transparent",
        strokeWidth: 0,
        borderRadius: 3,
      },
    };
  }),
];

// ── Slide 5: Three Bets for Q4 ────────────────────────────────────────────────
const bets = [
  "Ship the workspace API",
  "Double down on mid-market",
  "Land 3 design partners",
];

export const slide5Elements: SlideElement[] = [
  // Section label
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 500, colSpan: 5000, rowSpan: 350 },
    text: {
      content: "Three Bets for Q4",
      fontSize: 11,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      fontFamily: "mono",
    },
  },
  // 3 numbered items
  ...bets.flatMap((bet, i) => [
    // Number
    {
      id: id(),
      type: "text" as const,
      zIndex: 1,
      opacity: 1,
      rotation: 0,
      placement: { col: 500, row: 1400 + i * 1100, colSpan: 500, rowSpan: 700 },
      text: {
        content: `${i + 1}`,
        fontSize: 20,
        fontWeight: 800,
        fontStyle: "normal" as const,
        textDecoration: "none" as const,
        textAlign: "left" as const,
        color: TEAL,
      },
    },
    // Text
    {
      id: id(),
      type: "text" as const,
      zIndex: 1,
      opacity: 1,
      rotation: 0,
      placement: {
        col: 1200,
        row: 1400 + i * 1100,
        colSpan: 7800,
        rowSpan: 700,
      },
      text: {
        content: bet,
        fontSize: 20,
        fontWeight: 600,
        fontStyle: "normal" as const,
        textDecoration: "none" as const,
        textAlign: "left" as const,
        color: INK,
      },
    },
  ]),
];

// ── Slide 6: Closing ──────────────────────────────────────────────────────────
export const slide6Elements: SlideElement[] = [
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 1800, colSpan: 9000, rowSpan: 1400 },
    text: {
      content: "Let's build Q4.",
      fontSize: 48,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: INK,
    },
  },
  {
    id: id(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 3400, colSpan: 9000, rowSpan: 500 },
    text: {
      content: "— the team",
      fontSize: 12,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: MUTED,
      fontFamily: "mono",
    },
  },
];

// ── Lookup table ──────────────────────────────────────────────────────────────
export const SLIDE_ELEMENTS: Record<string, SlideElement[]> = {
  n1: slide1Elements,
  n2: slide2Elements,
  n3: slide3Elements,
  n4: slide4Elements,
  n5: slide5Elements,
  n6: slide6Elements,
};
