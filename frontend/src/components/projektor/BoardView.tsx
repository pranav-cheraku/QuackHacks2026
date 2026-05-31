import { useRef, useState } from "react";
import { GraphMapPanel } from "./GraphMapPanel";
import { GraphToolRail } from "./GraphToolRail";
import { StatusFilterPanel } from "./StatusFilterPanel";
import { DraggablePanel } from "./DraggablePanel";
import { Minimap } from "./Minimap";
import { SlideCard } from "./SlideCard";
import { VariantCard } from "./VariantCard";
import {
  INITIAL_NODES,
  INITIAL_EDGES,
  INITIAL_VARIANTS,
  type SlideNode,
  type Edge,
  type Variant,
  type SceneStatus,
} from "@/lib/projektor-data";
import { Maximize2, Minus, Plus, Sparkles } from "lucide-react";

interface Props {
  zoom: number;
  setZoom: (z: number) => void;
  onOpenEditor: (nodeId: string) => void;
}

// Placeholder chosen spine — real pick logic lands with the branch model.
const PICKED_PATH = new Set(["n1", "n3"]);

function buildPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
): string {
  // Vertical S-curve: flows downward from a (source bottom) to b (target top).
  const dy = b.y - a.y;
  const cy1 = a.y + dy * 0.5;
  const cy2 = b.y - dy * 0.5;
  return `M ${a.x} ${a.y} C ${a.x} ${cy1}, ${b.x} ${cy2}, ${b.x} ${b.y}`;
}

function anchor(n: SlideNode, side: "right" | "left" | "top" | "bottom") {
  const w = n.width ?? 320;
  const h = n.height ?? 180;
  if (side === "right") return { x: n.x + w, y: n.y + h / 2 };
  if (side === "left") return { x: n.x, y: n.y + h / 2 };
  if (side === "top") return { x: n.x + w / 2, y: n.y };
  return { x: n.x + w / 2, y: n.y + h };
}

export function BoardView({ zoom, setZoom, onOpenEditor }: Props) {
  const [nodes, setNodes] = useState<SlideNode[]>(INITIAL_NODES);
  const [edges] = useState<Edge[]>(INITIAL_EDGES);
  const [variants, setVariants] = useState<Variant[]>(INITIAL_VARIANTS);
  const [selected, setSelected] = useState<string | null>("n1");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusPicked, setFocusPicked] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<SceneStatus>>(
    () => new Set<SceneStatus>(["final", "in-review", "draft"]),
  );
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const findNode = (id: string) => nodes.find((n) => n.id === id)!;

  // A node dims when it's off the picked path (focus) or filtered out by status.
  const isNodeDimmed = (n: SlideNode) =>
    (focusPicked && !PICKED_PATH.has(n.id)) || !activeStatuses.has(n.status);
  const isEdgeDimmed = (e: Edge) =>
    isNodeDimmed(findNode(e.from)) || isNodeDimmed(findNode(e.to));

  const toggleStatus = (s: SceneStatus) =>
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  // Auto-tidy: lay the tree out top-down by depth, centered.
  const autoTidy = () => {
    const childrenMap = new Map<string, string[]>();
    edges.forEach((e) =>
      childrenMap.set(e.from, [...(childrenMap.get(e.from) ?? []), e.to]),
    );
    const hasParent = new Set(edges.map((e) => e.to));
    const depth = new Map<string, number>();
    const queue = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id);
    queue.forEach((id) => depth.set(id, 0));
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      const d = depth.get(id) ?? 0;
      (childrenMap.get(id) ?? []).forEach((c) => {
        if (!depth.has(c)) {
          depth.set(c, d + 1);
          queue.push(c);
        }
      });
    }
    const levels = new Map<number, string[]>();
    nodes.forEach((n) => {
      const d = depth.get(n.id) ?? 0;
      levels.set(d, [...(levels.get(d) ?? []), n.id]);
    });
    const vGap = 300;
    const hGap = 380;
    const topY = 80;
    const centerX = 760;
    setNodes((ns) =>
      ns.map((n) => {
        const d = depth.get(n.id) ?? 0;
        const level = levels.get(d) ?? [n.id];
        const idx = level.indexOf(n.id);
        const w = n.width ?? 320;
        return {
          ...n,
          x: centerX + (idx - (level.length - 1) / 2) * hGap - w / 2,
          y: topY + d * vGap,
        };
      }),
    );
    setPan({ x: 0, y: 0 });
  };

  // Outline click → select the node and fly the canvas to center it.
  const jumpTo = (id: string) => {
    setSelected(id);
    const n = nodes.find((x) => x.id === id);
    const vp = viewportRef.current;
    if (!n || !vp) return;
    const w = n.width ?? 320;
    const h = n.height ?? 180;
    setPan({
      x: vp.clientWidth / 2 - (n.x + w / 2) * zoom,
      y: vp.clientHeight / 2 - (n.y + h / 2) * zoom,
    });
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setSelected(null);
    panRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    const move = (ev: MouseEvent) => {
      if (!panRef.current) return;
      setPan({
        x: ev.clientX - panRef.current.x,
        y: ev.clientY - panRef.current.y,
      });
    };
    const up = () => {
      panRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const generateVariants = () => {
    if (!selected) return;
    const parent = findNode(selected);
    if (variants.some((v) => v.parentId === selected)) return;
    const baseY = parent.y + (parent.height ?? 170) + 120;
    const baseX = parent.x - 60;
    setVariants((vs) => [
      ...vs,
      {
        id: `v-${selected}-1`,
        parentId: selected,
        x: baseX,
        y: baseY + 10,
        rotation: -1.5,
        layout: "stacked",
        chosen: false,
      },
      {
        id: `v-${selected}-2`,
        parentId: selected,
        x: baseX + 180,
        y: baseY + 30,
        rotation: 1,
        layout: "centered",
        chosen: true,
      },
      {
        id: `v-${selected}-3`,
        parentId: selected,
        x: baseX + 360,
        y: baseY + 5,
        rotation: -0.5,
        layout: "split",
        chosen: false,
      },
    ]);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Canvas */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden dot-grid cursor-grab active:cursor-grabbing"
        onMouseDown={onCanvasMouseDown}
      >
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: 2400,
            height: 1200,
          }}
        >
          {/* Edges */}
          <svg
            className="absolute inset-0 pointer-events-none overflow-visible"
            width="2400"
            height="1200"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L6,4 L0,8 Z" fill="var(--accent)" />
              </marker>
            </defs>
            {edges.map((e, i) => {
              const a = anchor(findNode(e.from), "bottom");
              const b = anchor(findNode(e.to), "top");
              const dim = isEdgeDimmed(e);
              return (
                <path
                  key={i}
                  d={buildPath(a, b)}
                  fill="none"
                  stroke="var(--accent)"
                  strokeOpacity={dim ? 0.2 : 0.85}
                  strokeWidth="1.75"
                  strokeDasharray={e.dashed ? "5 4" : undefined}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>

          {/* Edge relation labels */}
          {edges.map((e, i) => {
            if (!e.relation) return null;
            const a = anchor(findNode(e.from), "bottom");
            const b = anchor(findNode(e.to), "top");
            const dim = isEdgeDimmed(e);
            return (
              <div
                key={`edge-label-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium pointer-events-none transition-opacity"
                style={{
                  left: (a.x + b.x) / 2,
                  top: (a.y + b.y) / 2,
                  background: "var(--accent-soft)",
                  color: "var(--accent-press)",
                  opacity: dim ? 0.3 : 1,
                }}
              >
                {e.relation}
              </div>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => (
            <div key={n.id} data-node>
              <SlideCard
                node={n}
                selected={selected === n.id}
                dimmed={isNodeDimmed(n)}
                onSelect={() => setSelected(n.id)}
                onOpenEditor={() => onOpenEditor(n.id)}
                onMove={(x, y) =>
                  setNodes((ns) =>
                    ns.map((m) => (m.id === n.id ? { ...m, x, y } : m)),
                  )
                }
                zoom={zoom}
              />
            </div>
          ))}

          {variants.map((v) => (
            <div key={v.id} data-node>
              <VariantCard v={v} />
            </div>
          ))}
        </div>

        {/* Left tool rail */}
        <GraphToolRail
          outlineOpen={outlineOpen}
          filterOpen={filterOpen}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          focusPicked={focusPicked}
          onToggleFocus={() => setFocusPicked((v) => !v)}
          minimapOpen={minimapOpen}
          onToggleMinimap={() => setMinimapOpen((v) => !v)}
          onAutoTidy={autoTidy}
        />

        {/* Draggable popovers (independent — can be open together) */}
        {outlineOpen && (
          <DraggablePanel
            title="Outline"
            width={248}
            defaultPos={{ x: 80, y: 24 }}
            onClose={() => setOutlineOpen(false)}
          >
            <GraphMapPanel
              nodes={nodes}
              edges={edges}
              selectedId={selected}
              onJump={jumpTo}
            />
          </DraggablePanel>
        )}
        {filterOpen && (
          <DraggablePanel
            title="Status filter"
            width={224}
            defaultPos={{ x: 344, y: 24 }}
            onClose={() => setFilterOpen(false)}
          >
            <StatusFilterPanel
              active={activeStatuses}
              onToggle={toggleStatus}
            />
          </DraggablePanel>
        )}

        {/* Minimap */}
        {minimapOpen && (
          <Minimap
            nodes={nodes}
            edges={edges}
            selectedId={selected}
            onJump={jumpTo}
            pan={pan}
            zoom={zoom}
            viewportW={viewportRef.current?.clientWidth ?? 0}
            viewportH={viewportRef.current?.clientHeight ?? 0}
          />
        )}

        {/* Floating toolbar */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-1 bg-chrome border border-border rounded-full shadow-[0_4px_20px_-6px_oklch(0.4_0.01_175/0.25)] px-1.5 py-1.5">
          <ToolBtn onClick={() => setZoom(Math.max(0.3, zoom - 0.05))}>
            <Minus size={13} />
          </ToolBtn>
          <span className="px-2 text-[11px] font-mono w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <ToolBtn onClick={() => setZoom(Math.min(2, zoom + 0.05))}>
            <Plus size={13} />
          </ToolBtn>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolBtn
            onClick={() => {
              setZoom(0.92);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize2 size={13} />
          </ToolBtn>
          <div className="w-px h-5 bg-border mx-1" />
          <button className="px-3 py-1.5 text-[12px] font-semibold rounded-full hover:bg-canvas/60 transition-colors flex items-center gap-1">
            <Plus size={12} /> Add slide
          </button>
          <button
            onClick={generateVariants}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-full text-white transition-opacity hover:opacity-90 flex items-center gap-1.5 ml-1"
            style={{ background: "var(--accent-teal)" }}
          >
            <Sparkles size={12} /> Generate variants
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-canvas/60 transition-colors text-ink"
    >
      {children}
    </button>
  );
}
