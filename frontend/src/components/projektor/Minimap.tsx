import type { SlideNode, Edge, SceneStatus } from "@/lib/projektor-data";

interface Props {
  nodes: SlideNode[];
  edges: Edge[];
  selectedId: string | null;
  onJump: (id: string) => void;
  pan: { x: number; y: number };
  zoom: number;
  viewportW: number;
  viewportH: number;
}

const W = 224;
const H = 156;
const PAD = 16;

const STATUS_COLOR: Record<SceneStatus, string> = {
  final: "var(--ok)",
  "in-review": "var(--warn)",
  draft: "var(--danger)",
};

// Overview map of the whole graph: connections + status-colored nodes + a
// rectangle showing the currently visible region. Click a node to fly there.
export function Minimap({
  nodes,
  edges,
  selectedId,
  onJump,
  pan,
  zoom,
  viewportW,
  viewportH,
}: Props) {
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + (n.width ?? 320)));
  const maxY = Math.max(...nodes.map((n) => n.y + (n.height ?? 180)));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
  const ox = PAD + (W - PAD * 2 - spanX * scale) / 2;
  const oy = PAD + (H - PAD * 2 - spanY * scale) / 2;
  const mx = (x: number) => ox + (x - minX) * scale;
  const my = (y: number) => oy + (y - minY) * scale;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cx = (n: SlideNode) => mx(n.x + (n.width ?? 320) / 2);
  const cy = (n: SlideNode) => my(n.y + (n.height ?? 180) / 2);

  // Currently-visible region, in canvas coords → minimap coords.
  const showViewport = viewportW > 0 && viewportH > 0;
  const visX = -pan.x / zoom;
  const visY = -pan.y / zoom;
  const visW = (viewportW / zoom) * scale;
  const visH = (viewportH / zoom) * scale;

  return (
    <div
      className="absolute right-4 bottom-4 z-10 rounded-xl border border-border bg-surface-2 shadow-[var(--sh-v)] overflow-hidden"
      style={{ width: W, height: H }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="absolute top-1.5 left-2.5 z-10 text-[9px] font-mono uppercase tracking-wider text-muted-foreground pointer-events-none">
        Map
      </div>
      <svg width={W} height={H} className="block">
        {/* connections */}
        {edges.map((e, i) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={cx(a)}
              y1={cy(a)}
              x2={cx(b)}
              y2={cy(b)}
              stroke="var(--accent)"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          );
        })}

        {/* visible-region rectangle */}
        {showViewport && (
          <rect
            x={mx(visX)}
            y={my(visY)}
            width={visW}
            height={visH}
            rx={3}
            fill="var(--accent)"
            fillOpacity={0.08}
            stroke="var(--accent)"
            strokeOpacity={0.6}
            strokeWidth={1}
          />
        )}

        {/* nodes */}
        {nodes.map((n) => {
          const sel = n.id === selectedId;
          return (
            <rect
              key={n.id}
              x={mx(n.x)}
              y={my(n.y)}
              width={Math.max(10, (n.width ?? 320) * scale)}
              height={Math.max(7, (n.height ?? 180) * scale)}
              rx={2.5}
              className="cursor-pointer"
              fill={sel ? "var(--accent-soft)" : "var(--surface)"}
              stroke={sel ? "var(--accent)" : STATUS_COLOR[n.status]}
              strokeWidth={sel ? 1.75 : 1.25}
              onClick={() => onJump(n.id)}
            >
              <title>{n.title}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
