import type { SlideCandidate } from "./projektor-data";
import type { SlideElement } from "./slide-model";
import {
  slide1Elements,
  slide2Elements,
  slide3Elements,
  slide4Elements,
  slide5Elements,
  slide6Elements,
} from "./initial-slides";

const TEAL = "oklch(0.54 0.105 192)";
const TEAL_LIGHT = "oklch(0.85 0.02 192)";
const INK = "oklch(0.24 0.009 185)";
const MUTED = "oklch(0.53 0.011 185)";

let _cid = 500;
const cid = () => `cand-${_cid++}`;

// ── Slide 1 alternates ────────────────────────────────────────────────────────

const n1_centered: SlideElement[] = [
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 850, colSpan: 9000, rowSpan: 380 },
    text: {
      content: "Q3 · FY26",
      fontSize: 12,
      fontWeight: 700,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: TEAL,
      fontFamily: "mono",
      letterSpacing: "0.25em",
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 1400, colSpan: 9000, rowSpan: 2100 },
    text: {
      content: "Strategy\nReview",
      fontSize: 72,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: INK,
      lineHeight: 0.95,
    },
  },
  {
    id: cid(),
    type: "shape",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 3800, row: 3700, colSpan: 2400, rowSpan: 60 },
    shape: {
      fill: TEAL,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 4,
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 1500, row: 3900, colSpan: 7000, rowSpan: 700 },
    text: {
      content: "Aligning Q4 priorities across product, sales, and operations.",
      fontSize: 16,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: MUTED,
      lineHeight: 1.4,
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 3000, row: 4800, colSpan: 4000, rowSpan: 400 },
    text: {
      content: "Avery Kim · Head of Strategy",
      fontSize: 11,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: MUTED,
      fontFamily: "mono",
    },
  },
];

const n1_split: SlideElement[] = [
  {
    id: cid(),
    type: "shape",
    zIndex: 0,
    opacity: 1,
    rotation: 0,
    placement: { col: 5200, row: 0, colSpan: 4800, rowSpan: 5625 },
    shape: {
      fill: TEAL,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 0,
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 800, colSpan: 4400, rowSpan: 380 },
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
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 1400, colSpan: 4400, rowSpan: 2100 },
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
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 3700, colSpan: 4400, rowSpan: 800 },
    text: {
      content: "Aligning Q4 priorities across product, sales, and operations.",
      fontSize: 15,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      color: MUTED,
      lineHeight: 1.4,
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 2,
    opacity: 1,
    rotation: 0,
    placement: { col: 5800, row: 2000, colSpan: 3200, rowSpan: 1100 },
    text: {
      content: "AK",
      fontSize: 60,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: "white",
      fontFamily: "mono",
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 2,
    opacity: 1,
    rotation: 0,
    placement: { col: 5500, row: 3300, colSpan: 4000, rowSpan: 400 },
    text: {
      content: "Avery Kim",
      fontSize: 16,
      fontWeight: 700,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: "white",
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 2,
    opacity: 0.7,
    rotation: 0,
    placement: { col: 5500, row: 3800, colSpan: 4000, rowSpan: 350 },
    text: {
      content: "Head of Strategy",
      fontSize: 12,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: "white",
      fontFamily: "mono",
    },
  },
];

// ── Slide 2 alternate: Stacked ────────────────────────────────────────────────

const n2_stacked: SlideElement[] = [
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 400, colSpan: 4000, rowSpan: 380 },
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
  ...(
    [
      ["+18%", "YoY Growth"],
      ["2.4M", "Active Users"],
      ["94%", "Retention"],
    ] as const
  ).flatMap(([num, label], i): SlideElement[] => [
    {
      id: cid(),
      type: "text",
      zIndex: 1,
      opacity: 1,
      rotation: 0,
      placement: {
        col: 500,
        row: 1000 + i * 1400,
        colSpan: 5000,
        rowSpan: 920,
      },
      text: {
        content: num,
        fontSize: 48,
        fontWeight: 800,
        fontStyle: "normal",
        textDecoration: "none",
        textAlign: "left",
        color: TEAL,
        lineHeight: 1,
      },
    },
    {
      id: cid(),
      type: "text",
      zIndex: 1,
      opacity: 1,
      rotation: 0,
      placement: {
        col: 500,
        row: 1940 + i * 1400,
        colSpan: 5000,
        rowSpan: 380,
      },
      text: {
        content: label.toUpperCase(),
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
  ]),
];

// ── Slide 5 alternate: Cards ──────────────────────────────────────────────────

const n5_bets = [
  "Ship the workspace API",
  "Double down on mid-market",
  "Land 3 design partners",
] as const;

const n5_cards: SlideElement[] = [
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 400, colSpan: 5000, rowSpan: 380 },
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
  ...n5_bets.flatMap((bet, i): SlideElement[] => {
    const col = 300 + i * 3250;
    return [
      {
        id: cid(),
        type: "shape",
        zIndex: 1,
        opacity: 1,
        rotation: 0,
        placement: { col, row: 1000, colSpan: 3000, rowSpan: 4200 },
        shape: {
          fill: TEAL_LIGHT,
          stroke: "transparent",
          strokeWidth: 0,
          borderRadius: 8,
        },
      },
      {
        id: cid(),
        type: "text",
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        placement: { col: col + 200, row: 1300, colSpan: 2600, rowSpan: 900 },
        text: {
          content: `${i + 1}`,
          fontSize: 36,
          fontWeight: 800,
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "left",
          color: TEAL,
        },
      },
      {
        id: cid(),
        type: "text",
        zIndex: 2,
        opacity: 1,
        rotation: 0,
        placement: { col: col + 200, row: 2400, colSpan: 2600, rowSpan: 1400 },
        text: {
          content: bet,
          fontSize: 16,
          fontWeight: 600,
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "left",
          color: INK,
        },
      },
    ];
  }),
];

// ── Slide 6 alternate: Dark Impact ───────────────────────────────────────────

const n6_impact: SlideElement[] = [
  {
    id: cid(),
    type: "shape",
    zIndex: 0,
    opacity: 1,
    rotation: 0,
    placement: { col: 0, row: 0, colSpan: 10000, rowSpan: 5625 },
    shape: {
      fill: INK,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 0,
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    placement: { col: 500, row: 1400, colSpan: 9000, rowSpan: 2100 },
    text: {
      content: "Let's build Q4.",
      fontSize: 60,
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: "white",
      lineHeight: 0.95,
    },
  },
  {
    id: cid(),
    type: "text",
    zIndex: 1,
    opacity: 0.55,
    rotation: 0,
    placement: { col: 500, row: 3700, colSpan: 9000, rowSpan: 500 },
    text: {
      content: "— the team",
      fontSize: 14,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      color: "white",
      fontFamily: "mono",
    },
  },
];

// ── Lookup table ──────────────────────────────────────────────────────────────
// Each array represents the design candidates for one slide.
// "Original" is always index 0 and references the same element data as SLIDE_ELEMENTS
// (elements are deep-copied with fresh IDs when a candidate is applied).
// To add AI-generated candidates later, push to these arrays; the gallery and
// swap mechanism read from this structure with no other changes required.

export const SLIDE_CANDIDATES: Record<string, SlideCandidate[]> = {
  n1: [
    { id: "n1-c1", label: "Original", elements: slide1Elements },
    { id: "n1-c2", label: "Centered", elements: n1_centered },
    { id: "n1-c3", label: "Split", elements: n1_split },
  ],
  n2: [
    { id: "n2-c1", label: "Original", elements: slide2Elements },
    { id: "n2-c2", label: "Stacked", elements: n2_stacked },
  ],
  n3: [{ id: "n3-c1", label: "Original", elements: slide3Elements }],
  n4: [{ id: "n4-c1", label: "Original", elements: slide4Elements }],
  n5: [
    { id: "n5-c1", label: "Original", elements: slide5Elements },
    { id: "n5-c2", label: "Cards", elements: n5_cards },
  ],
  n6: [
    { id: "n6-c1", label: "Original", elements: slide6Elements },
    { id: "n6-c2", label: "Dark Impact", elements: n6_impact },
  ],
};
