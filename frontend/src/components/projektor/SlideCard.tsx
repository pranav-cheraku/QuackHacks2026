import { Check } from "lucide-react";
import { useRef } from "react";
import type { SlideNode, SceneKind, SceneStatus } from "@/lib/projektor-data";

interface Props {
  node: SlideNode;
  selected: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  onOpenEditor: () => void;
  onMove: (x: number, y: number) => void;
  zoom: number;
}

const KIND_LABEL: Record<SceneKind, string> = {
  title: "TITLE",
  problem: "PROBLEM",
  data: "DATA",
};

const STATUS_LABEL: Record<SceneStatus, string> = {
  final: "Final",
  draft: "Draft",
  "in-review": "In Review",
};

const STATUS_DOT: Record<SceneStatus, string> = {
  final: "var(--ok)", // green
  "in-review": "var(--warn)", // orange
  draft: "var(--danger)", // red
};

export function SlideCard({
  node,
  selected,
  dimmed = false,
  onSelect,
  onOpenEditor,
  onMove,
  zoom,
}: Props) {
  const dragging = useRef<{ ox: number; oy: number } | null>(null);
  const w = node.width ?? 320;

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.stopPropagation();
    onSelect();
    dragging.current = { ox: e.clientX, oy: e.clientY };
    const startX = node.x;
    const startY = node.y;
    const move = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onMove(
        startX + (ev.clientX - dragging.current.ox) / zoom,
        startY + (ev.clientY - dragging.current.oy) / zoom,
      );
    };
    const up = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      className="absolute select-none transition-opacity"
      style={{ left: node.x, top: node.y, width: w, opacity: dimmed ? 0.4 : 1 }}
      onMouseDown={onMouseDown}
      onDoubleClick={onOpenEditor}
    >
      <div
        className={`rounded-2xl bg-card border transition-all ${
          selected
            ? "border-transparent ring-2 ring-[color:var(--accent)] shadow-[var(--sh-v)]"
            : "border-border shadow-[0_2px_10px_-4px_rgba(40,30,20,0.12)]"
        }`}
      >
        {/* Top row: number · eyebrow · check */}
        <div className="flex items-center gap-2 px-4 pt-3.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink text-white font-mono text-[11px] font-semibold shrink-0">
            {String(node.index).padStart(2, "0")}
          </span>
          {node.eyebrow && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {node.eyebrow}
            </span>
          )}
          {node.status === "final" && (
            <span
              className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
          )}
        </div>

        {/* Title */}
        <div className="px-4 pt-2 font-serif text-[22px] leading-[1.12] text-ink">
          {node.title}
        </div>

        {/* Preview */}
        <div className="px-4 pt-3 pb-4">
          <Preview node={node} />
        </div>
      </div>

      {/* Below card: type label · status pill */}
      <div className="mt-2 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {KIND_LABEL[node.kind]}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: STATUS_DOT[node.status] }}
          />
          {STATUS_LABEL[node.status]}
        </span>
      </div>
    </div>
  );
}

function Preview({ node }: { node: SlideNode }) {
  if (node.kind === "title") {
    return (
      <p className="text-[12.5px] leading-snug text-muted-foreground">
        {node.body}
      </p>
    );
  }

  if (node.kind === "problem") {
    return (
      <div className="space-y-2 py-1">
        {["w-full", "w-full", "w-4/5", "w-2/3"].map((wd, i) => (
          <div key={i} className={`h-2 rounded-full bg-canvas ${wd}`} />
        ))}
      </div>
    );
  }

  // data → bar chart
  const bars = [38, 54, 72, 96];
  return (
    <div>
      <div className="flex items-end gap-3 h-20">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-md"
            style={{
              height: `${h}%`,
              background:
                i === bars.length - 1 ? "var(--accent)" : "var(--accent-soft)",
            }}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-1.5">
        {["Q1", "Q2", "Q3", "Q4"].map((q) => (
          <div
            key={q}
            className="flex-1 text-center font-mono text-[9px] text-muted-foreground"
          >
            {q}
          </div>
        ))}
      </div>
    </div>
  );
}
