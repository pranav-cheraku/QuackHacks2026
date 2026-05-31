// Mock SlideSpec fixture data for the 6 initial slides.
// Positions/sizes are in 0–100 percentage units (x + w <= 100, y + h <= 100).
// IDs match INITIAL_NODES ("n1"–"n6") so the EditorView lookup works correctly.
// Converted from the original grid coordinates: col/10000*100, row/5625*100.

import type { SlideSpec } from "./slide-spec";

const TEAL       = "oklch(0.54 0.105 192)";
const TEAL_LIGHT = "oklch(0.85 0.02 192)";
const INK        = "oklch(0.24 0.009 185)";
const MUTED      = "oklch(0.53 0.011 185)";
const BLUE       = "oklch(0.55 0.1 250)";

const BASE_THEME = {
  background: "#ffffff",
  palette: [TEAL, INK, MUTED, BLUE, TEAL_LIGHT],
  fontFamily: "Inter",
};

// ── Slide 1: Title ────────────────────────────────────────────────────────────
// Original layout: teal right bar, eyebrow, large headline, subtitle, avatar+byline
const slide1: SlideSpec = {
  id: "n1",
  layout: "split-right",
  theme: BASE_THEME,
  elements: [
    // Teal accent bar (right edge, full height)  col:9500 row:0 span:500×5625
    {
      id: "n1-bar",
      type: "divider",
      position: { x: 95, y: 0 },
      size: { w: 5, h: 100 },
      zIndex: 0,
      style: { fill: TEAL, stroke: "transparent", strokeWidth: 0, borderRadius: 0 },
    },
    // Eyebrow label  col:500 row:500 span:2500×350
    {
      id: "n1-eyebrow",
      type: "byline",
      position: { x: 5, y: 8.89 },
      size: { w: 25, h: 6.22 },
      zIndex: 1,
      content: "Q3 · FY26",
      style: { color: TEAL, fontFamily: "mono", fontWeight: 700, letterSpacing: "0.25em" },
    },
    // Main headline  col:500 row:1100 span:8700×2000
    {
      id: "n1-headline",
      type: "header",
      position: { x: 5, y: 19.56 },
      size: { w: 87, h: 35.56 },
      zIndex: 1,
      content: "Strategy\nReview",
      style: { fontSize: 72, fontWeight: 800, color: INK, lineHeight: 0.95 },
    },
    // Subtitle  col:500 row:3300 span:7000×900
    {
      id: "n1-subtitle",
      type: "body",
      position: { x: 5, y: 58.67 },
      size: { w: 70, h: 16 },
      zIndex: 1,
      content: "Aligning Q4 priorities across product, sales, and operations — what's working, what's next.",
      style: { fontSize: 18, color: MUTED, lineHeight: 1.4 },
    },
    // Avatar circle  col:500 row:4600 span:430×430
    {
      id: "n1-avatar-bg",
      type: "divider",
      position: { x: 5, y: 81.78 },
      size: { w: 4.3, h: 7.64 },
      zIndex: 1,
      style: { fill: BLUE, stroke: "transparent", strokeWidth: 0, borderRadius: 999 },
    },
    // Avatar initials (overlaps circle)
    {
      id: "n1-avatar-initials",
      type: "byline",
      position: { x: 5, y: 81.78 },
      size: { w: 4.3, h: 7.64 },
      zIndex: 2,
      content: "AK",
      style: { color: "white", fontWeight: 700, textAlign: "center" },
    },
    // Name  col:1100 row:4600 span:3000×350
    {
      id: "n1-name",
      type: "byline",
      position: { x: 11, y: 81.78 },
      size: { w: 30, h: 6.22 },
      zIndex: 1,
      content: "Avery Kim",
      style: { color: INK, fontWeight: 700, fontSize: 13 },
    },
    // Role  col:1100 row:4950 span:3000×350
    {
      id: "n1-role",
      type: "byline",
      position: { x: 11, y: 88 },
      size: { w: 30, h: 6.22 },
      zIndex: 1,
      content: "Head of Strategy",
      style: { color: MUTED, fontFamily: "mono" },
    },
  ],
};

// ── Slide 2: By the Numbers ───────────────────────────────────────────────────
// Original layout: section label + 3-column stat grid
const slide2: SlideSpec = {
  id: "n2",
  layout: "grid-3",
  theme: BASE_THEME,
  elements: [
    // Section label  col:500 row:500 span:4000×350
    {
      id: "n2-label",
      type: "byline",
      position: { x: 5, y: 8.89 },
      size: { w: 40, h: 6.22 },
      zIndex: 1,
      content: "By the Numbers",
      style: { color: MUTED, fontFamily: "mono", letterSpacing: "0.05em" },
    },
    // Stat 1 — number  col:200 row:1600 span:3000×1100
    {
      id: "n2-stat1",
      type: "stat",
      position: { x: 2, y: 28.44 },
      size: { w: 30, h: 19.56 },
      zIndex: 1,
      content: "+18%",
      style: { fontSize: 48, fontWeight: 800, color: TEAL, lineHeight: 1 },
    },
    // Stat 1 — label  col:200 row:2800 span:3000×400
    {
      id: "n2-stat1-label",
      type: "byline",
      position: { x: 2, y: 49.78 },
      size: { w: 30, h: 7.11 },
      zIndex: 1,
      content: "YOY GROWTH",
      style: { color: MUTED, fontFamily: "mono", letterSpacing: "0.05em" },
    },
    // Stat 2 — number  col:3700 row:1600 span:3000×1100
    {
      id: "n2-stat2",
      type: "stat",
      position: { x: 37, y: 28.44 },
      size: { w: 30, h: 19.56 },
      zIndex: 1,
      content: "2.4M",
      style: { fontSize: 48, fontWeight: 800, color: TEAL, lineHeight: 1 },
    },
    // Stat 2 — label  col:3700 row:2800 span:3000×400
    {
      id: "n2-stat2-label",
      type: "byline",
      position: { x: 37, y: 49.78 },
      size: { w: 30, h: 7.11 },
      zIndex: 1,
      content: "ACTIVE USERS",
      style: { color: MUTED, fontFamily: "mono", letterSpacing: "0.05em" },
    },
    // Stat 3 — number  col:7200 row:1600 span:2600×1100
    {
      id: "n2-stat3",
      type: "stat",
      position: { x: 72, y: 28.44 },
      size: { w: 26, h: 19.56 },
      zIndex: 1,
      content: "94%",
      style: { fontSize: 48, fontWeight: 800, color: TEAL, lineHeight: 1 },
    },
    // Stat 3 — label  col:7200 row:2800 span:2600×400
    {
      id: "n2-stat3-label",
      type: "byline",
      position: { x: 72, y: 49.78 },
      size: { w: 26, h: 7.11 },
      zIndex: 1,
      content: "RETENTION",
      style: { color: MUTED, fontFamily: "mono", letterSpacing: "0.05em" },
    },
  ],
};

// ── Slide 3: Market Landscape (ingredient — placeholder content) ───────────────
const slide3: SlideSpec = {
  id: "n3",
  layout: "centered",
  theme: BASE_THEME,
  elements: [
    // Section label  col:500 row:500 span:5000×500
    {
      id: "n3-label",
      type: "byline",
      position: { x: 5, y: 8.89 },
      size: { w: 50, h: 8.89 },
      zIndex: 1,
      content: "Market Landscape",
      style: { color: MUTED, fontFamily: "mono", fontWeight: 600, fontSize: 14 },
    },
    // Placeholder text  col:2000 row:2000 span:6000×1500
    {
      id: "n3-placeholder",
      type: "body",
      position: { x: 20, y: 35.56 },
      size: { w: 60, h: 26.67 },
      zIndex: 1,
      opacity: 0.45,
      content: "Content to be added",
      style: { fontSize: 24, textAlign: "center", color: MUTED },
    },
  ],
};

// ── Slide 4: Growth Trajectory (bar chart) ────────────────────────────────────
// Chart area: col 500–9400, row 1000–5200.  chartBottom=5200, chartH=4200
// 8 bars: barW=1000, gap=80.  barPcts=[28,42,38,55,61,72,68,84]
// colStart = 500 + i*(1000+80); barHeight = round(pct/100*4200)
// rowStart = 5200 - barHeight
// → x = colStart/10000*100,  y = rowStart/5625*100
//   w = 1000/10000*100 = 10,  h = barHeight/5625*100

const barPcts = [28, 42, 38, 55, 61, 72, 68, 84];
const chartBottom = 5200;
const chartH = 4200;

const barElements = barPcts.map((pct, i) => {
  const barHeight = Math.round((pct / 100) * chartH);
  const colStart  = 500 + i * 1080;
  const rowStart  = chartBottom - barHeight;
  return {
    id: `n4-bar-${i}`,
    type: "divider" as const,
    position: { x: parseFloat((colStart / 10000 * 100).toFixed(2)), y: parseFloat((rowStart / 5625 * 100).toFixed(2)) },
    size: { w: 10, h: parseFloat((barHeight / 5625 * 100).toFixed(2)) },
    zIndex: 1,
    style: { fill: i > 4 ? TEAL : TEAL_LIGHT, stroke: "transparent", strokeWidth: 0, borderRadius: 3 },
  };
});

const slide4: SlideSpec = {
  id: "n4",
  layout: "full-bleed",
  theme: BASE_THEME,
  elements: [
    // Section label  col:500 row:500 span:5000×350
    {
      id: "n4-label",
      type: "byline",
      position: { x: 5, y: 8.89 },
      size: { w: 50, h: 6.22 },
      zIndex: 1,
      content: "Growth Trajectory",
      style: { color: MUTED, fontFamily: "mono" },
    },
    ...barElements,
  ],
};

// ── Slide 5: Three Bets for Q4 ────────────────────────────────────────────────
// 3 numbered list items. Each row: col:500 row:1400+i*1100 span:500×700 (number)
//                                   col:1200 row:1400+i*1100 span:7800×700 (text)
// row:1400/5625=24.89, row:2500/5625=44.44, row:3600/5625=64
// rowSpan:700/5625=12.44

const bets = [
  "Ship the workspace API",
  "Double down on mid-market",
  "Land 3 design partners",
];

const betElements = bets.flatMap((bet, i) => {
  const y = parseFloat(((1400 + i * 1100) / 5625 * 100).toFixed(2));
  return [
    {
      id: `n5-num-${i}`,
      type: "stat" as const,
      position: { x: 5, y },
      size: { w: 5, h: 12.44 },
      zIndex: 1,
      content: `${i + 1}`,
      style: { fontSize: 20, fontWeight: 800, color: TEAL },
    },
    {
      id: `n5-bet-${i}`,
      type: "list" as const,
      position: { x: 12, y },
      size: { w: 78, h: 12.44 },
      zIndex: 1,
      content: bet,
      style: { fontSize: 20, fontWeight: 600, color: INK },
    },
  ];
});

const slide5: SlideSpec = {
  id: "n5",
  layout: "grid-3",
  theme: BASE_THEME,
  elements: [
    // Section label  col:500 row:500 span:5000×350
    {
      id: "n5-label",
      type: "byline",
      position: { x: 5, y: 8.89 },
      size: { w: 50, h: 6.22 },
      zIndex: 1,
      content: "Three Bets for Q4",
      style: { color: MUTED, fontFamily: "mono" },
    },
    ...betElements,
  ],
};

// ── Slide 6: Closing ──────────────────────────────────────────────────────────
// col:500 row:1800 span:9000×1400  →  x:5, y:32, w:90, h:24.89
// col:500 row:3400 span:9000×500   →  x:5, y:60.44, w:90, h:8.89
const slide6: SlideSpec = {
  id: "n6",
  layout: "centered",
  theme: BASE_THEME,
  elements: [
    {
      id: "n6-headline",
      type: "header",
      position: { x: 5, y: 32 },
      size: { w: 90, h: 24.89 },
      zIndex: 1,
      content: "Let's build Q4.",
      style: { fontSize: 48, fontWeight: 800, textAlign: "center", color: INK },
    },
    {
      id: "n6-byline",
      type: "byline",
      position: { x: 5, y: 60.44 },
      size: { w: 90, h: 8.89 },
      zIndex: 1,
      content: "— the team",
      style: { textAlign: "center", fontFamily: "mono", color: MUTED },
    },
  ],
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const MOCK_SLIDE_SPECS: SlideSpec[] = [
  slide1, slide2, slide3, slide4, slide5, slide6,
];

export const MOCK_SPECS_BY_NODE_ID: Record<string, SlideSpec> = {
  n1: slide1,
  n2: slide2,
  n3: slide3,
  n4: slide4,
  n5: slide5,
  n6: slide6,
};
