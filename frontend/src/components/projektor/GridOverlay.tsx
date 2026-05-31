import { GRID_COLS, GRID_ROWS, SNAP_STEP } from "@/lib/grid";

interface Props {
  visible: boolean;
}

const TEAL = "oklch(0.54 0.105 192)";
const MAJOR_STEP = 1000;
const MINOR_LINE_WIDTH = 3;
const MAJOR_LINE_WIDTH = 6;
const EDGE_WIDTH = 10;
const LABEL_SIZE = 58;

function rangeByStep(max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = 0; value <= max; value += step) {
    values.push(value);
  }
  return values;
}

function unique(values: number[]): number[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function GridOverlay({ visible }: Props) {
  if (!visible) return null;

  const minorCols = rangeByStep(GRID_COLS, SNAP_STEP).filter(
    (x) => x > 0 && x < GRID_COLS && x % MAJOR_STEP !== 0,
  );
  const minorRows = rangeByStep(GRID_ROWS, SNAP_STEP).filter(
    (y) => y > 0 && y < GRID_ROWS && y % MAJOR_STEP !== 0,
  );
  const majorCols = rangeByStep(GRID_COLS, MAJOR_STEP).filter(
    (x) => x > 0 && x < GRID_COLS,
  );
  const majorRows = rangeByStep(GRID_ROWS, MAJOR_STEP).filter(
    (y) => y > 0 && y < GRID_ROWS,
  );
  const labeledRows = unique([...rangeByStep(GRID_ROWS, MAJOR_STEP), GRID_ROWS]);

  return (
    <svg
      className="absolute inset-0 block pointer-events-none z-50 select-none w-full h-full"
      viewBox={`0 0 ${GRID_COLS} ${GRID_ROWS}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="0" y="0" width={GRID_COLS} height={GRID_ROWS} fill={TEAL} opacity="0.025" />

      {minorCols.map((x) => (
        <line
          key={`minor-c${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={GRID_ROWS}
          stroke={TEAL}
          strokeWidth={MINOR_LINE_WIDTH}
          opacity={0.08}
        />
      ))}
      {minorRows.map((y) => (
        <line
          key={`minor-r${y}`}
          x1={0}
          y1={y}
          x2={GRID_COLS}
          y2={y}
          stroke={TEAL}
          strokeWidth={MINOR_LINE_WIDTH}
          opacity={0.08}
        />
      ))}

      {majorCols.map((x) => (
        <line
          key={`major-c${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={GRID_ROWS}
          stroke={TEAL}
          strokeWidth={MAJOR_LINE_WIDTH}
          opacity={0.28}
        />
      ))}
      {majorRows.map((y) => (
        <line
          key={`major-r${y}`}
          x1={0}
          y1={y}
          x2={GRID_COLS}
          y2={y}
          stroke={TEAL}
          strokeWidth={MAJOR_LINE_WIDTH}
          opacity={0.28}
        />
      ))}

      {/* Edge strips are rects, not centered strokes, so they are flush with the slide bounds. */}
      <rect x="0" y="0" width={EDGE_WIDTH} height={GRID_ROWS} fill={TEAL} opacity="0.55" />
      <rect x={GRID_COLS - EDGE_WIDTH} y="0" width={EDGE_WIDTH} height={GRID_ROWS} fill={TEAL} opacity="0.55" />
      <rect x="0" y="0" width={GRID_COLS} height={EDGE_WIDTH} fill={TEAL} opacity="0.55" />
      <rect x="0" y={GRID_ROWS - EDGE_WIDTH} width={GRID_COLS} height={EDGE_WIDTH} fill={TEAL} opacity="0.55" />

      {labeledRows.map((row) =>
        rangeByStep(GRID_COLS, MAJOR_STEP).map((col) => {
          const edge = (col === 0 || col === GRID_COLS) && (row === 0 || row === GRID_ROWS);
          const x = Math.min(col + 22, GRID_COLS - 560);
          const y = Math.min(row + LABEL_SIZE + 10, GRID_ROWS - 20);

          return (
            <text
              key={`lbl-${col}-${row}`}
              x={x}
              y={y}
              fill={TEAL}
              opacity={edge ? 0.8 : 0.5}
              fontFamily="var(--font-mono, monospace)"
              fontSize={LABEL_SIZE}
              fontWeight={500}
            >
              {col},{row}
            </text>
          );
        }),
      )}

      <g transform={`translate(${GRID_COLS - 1770}, ${GRID_ROWS - 250})`} opacity="0.88">
        <rect width="1720" height="170" rx="20" fill={TEAL} />
        <text
          x="85"
          y="112"
          fill="white"
          fontFamily="var(--font-mono, monospace)"
          fontSize="78"
          fontWeight="700"
          letterSpacing="6"
        >
          {GRID_COLS.toLocaleString()} x {GRID_ROWS.toLocaleString()} - snap {SNAP_STEP}
        </text>
      </g>
    </svg>
  );
}
