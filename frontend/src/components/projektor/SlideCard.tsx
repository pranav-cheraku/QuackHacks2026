import { Check, Plus } from "lucide-react";
import { useRef } from "react";
import type { ComponentType, SlideNode } from "@/lib/projektor-data";
import { SlideThumb } from "./SlideThumb";

interface Props {
  node: SlideNode;
  selected: boolean;
  onSelect: () => void;
  onOpenEditor: () => void;
  onMove: (x: number, y: number) => void;
  onDropComponent: (c: ComponentType) => void;
  zoom: number;
}

function chipStyle(c: ComponentType): string {
  if (c === "Header") return "bg-ink text-white border-ink font-bold";
  if (c === "Stat")
    return "border-[color:var(--accent-teal)]/40 bg-[color:var(--accent-soft)]/40 text-ink";
  if (["Image", "Chart", "Video", "Divider"].includes(c))
    return "bg-canvas/60 border-border text-ink";
  return "bg-white border-border text-muted-foreground";
}

export function SlideCard({
  node,
  selected,
  onSelect,
  onOpenEditor,
  onMove,
  onDropComponent,
  zoom,
}: Props) {
  const dragging = useRef<{ ox: number; oy: number } | null>(null);
  const w = node.width ?? 280;
  const h = node.height ?? 170;

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
      className="absolute select-none"
      style={{
        left: node.x,
        top: node.y,
        width: w,
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onOpenEditor}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        const c = e.dataTransfer.getData("component") as ComponentType;
        if (c) onDropComponent(c);
      }}
    >
      <div
        className={`relative rounded-md overflow-hidden bg-card shadow-[0_2px_10px_-4px_oklch(0.4_0.01_175/0.2)] transition-all ${
          selected ? "ring-2 ring-[color:var(--accent-teal)]" : ""
        } ${node.state === "ingredient" ? "border-2 border-dashed border-border" : "border border-border"}`}
        style={{ minHeight: h }}
      >
        {node.state === "rendered" ? (
          <div style={{ height: h }}>
            <SlideThumb node={node} />
          </div>
        ) : (
          <div className="p-2.5 flex flex-col gap-1.5">
            {node.components.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-8 font-mono">
                Drop components here
              </div>
            ) : (
              node.components.map((c, i) => (
                <div
                  key={i}
                  className={`px-2 py-1 text-[10px] rounded-[4px] border ${chipStyle(c)}`}
                >
                  {c}
                </div>
              ))
            )}
            <button
              data-no-drag
              className="text-muted-foreground hover:text-ink text-[10px] flex items-center justify-center gap-1 py-1 mt-0.5 border border-dashed border-border rounded-[4px] hover:bg-canvas/50"
            >
              <Plus size={10} /> add
            </button>
          </div>
        )}
        {node.state === "rendered" && (
          <div
            className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-white/90 border border-border"
            style={{ color: "var(--accent-teal)" }}
          >
            <Check size={8} strokeWidth={3} /> rendered
          </div>
        )}
      </div>
      <div className="mt-1.5 text-[10px] font-mono text-muted-foreground text-center">
        {String(node.index).padStart(2, "0")} · {node.title}
      </div>
    </div>
  );
}
