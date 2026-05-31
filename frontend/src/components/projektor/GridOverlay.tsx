import {
  GRID_COLS,
  GRID_ROWS,
  OVERLAY_COLS,
  OVERLAY_ROWS,
  OVERLAY_MAJOR_EVERY,
  SNAP_STEP,
} from "@/lib/grid";

interface Props {
  visible: boolean;
}

const TEAL = "oklch(0.54 0.105 192)";
const COL_PCT = 100 / OVERLAY_COLS;
const ROW_PCT = 100 / OVERLAY_ROWS;

function isMajor(i: number) {
  return i % OVERLAY_MAJOR_EVERY === 0;
}

export function GridOverlay({ visible }: Props) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-50 select-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 220ms ease" }}
      aria-hidden="true"
    >
      {/* Subtle wash */}
      <div className="absolute inset-0" style={{ background: TEAL, opacity: 0.025 }} />

      {/* ── Column lines ── */}
      {Array.from({ length: OVERLAY_COLS + 1 }, (_, i) => {
        const edge  = i === 0 || i === OVERLAY_COLS;
        const major = isMajor(i);
        return (
          <div
            key={`c${i}`}
            className="absolute top-0 bottom-0"
            style={{
              left:       `${i * COL_PCT}%`,
              width:      "1px",
              background: TEAL,
              opacity:    edge ? 0.55 : major ? 0.28 : 0.11,
            }}
          />
        );
      })}

      {/* ── Row lines ── */}
      {Array.from({ length: OVERLAY_ROWS + 1 }, (_, i) => {
        const edge  = i === 0 || i === OVERLAY_ROWS;
        const major = isMajor(i);
        return (
          <div
            key={`r${i}`}
            className="absolute left-0 right-0"
            style={{
              top:        `${i * ROW_PCT}%`,
              height:     "1px",
              background: TEAL,
              opacity:    edge ? 0.55 : major ? 0.28 : 0.11,
            }}
          />
        );
      })}

      {/* ── Coordinate labels at major intersections only ── */}
      {Array.from({ length: OVERLAY_ROWS + 1 }, (_, vRow) =>
        isMajor(vRow)
          ? Array.from({ length: OVERLAY_COLS + 1 }, (_, vCol) => {
              if (!isMajor(vCol)) return null;
              const edge = (vCol === 0 || vCol === OVERLAY_COLS) && (vRow === 0 || vRow === OVERLAY_ROWS);
              const fineCol = Math.round((vCol / OVERLAY_COLS) * GRID_COLS);
              const fineRow = Math.round((vRow / OVERLAY_ROWS) * GRID_ROWS);
              return (
                <div
                  key={`lbl-${vCol}-${vRow}`}
                  className="absolute"
                  style={{ left: `${vCol * COL_PCT}%`, top: `${vRow * ROW_PCT}%` }}
                >
                  <span
                    style={{
                      display:    "block",
                      transform:  "translate(2px, 2px)",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize:   "6px",
                      lineHeight: 1,
                      color:      TEAL,
                      opacity:    edge ? 0.8 : 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fineCol},{fineRow}
                  </span>
                </div>
              );
            })
          : null
      )}

      {/* ── Info badge ── */}
      <div
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded px-2 py-1"
        style={{ background: TEAL, opacity: 0.88 }}
      >
        <span
          style={{
            fontFamily:    "var(--font-mono, monospace)",
            fontSize:      "8px",
            color:         "white",
            fontWeight:    700,
            letterSpacing: "0.06em",
          }}
        >
          {GRID_COLS.toLocaleString()} × {GRID_ROWS.toLocaleString()} · snap {SNAP_STEP}
        </span>
      </div>
    </div>
  );
}
