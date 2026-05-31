import { useRef, useState } from "react";
import { GraphMapPanel } from "./GraphMapPanel";
import { GraphToolRail } from "./GraphToolRail";
import { StatusFilterPanel } from "./StatusFilterPanel";
import { DraggablePanel } from "./DraggablePanel";
import { Minimap } from "./Minimap";
import { ScenePanel } from "./ScenePanel";
import { SlideCard } from "./SlideCard";
import {
  INITIAL_NODES,
  INITIAL_EDGES,
  type SlideNode,
  type Edge,
  type EdgeRelation,
  type SceneStatus,
  type SceneRole,
  type ComponentType,
  type ContentBlock,
} from "@/lib/projektor-data";
import { Maximize2, Minus, Plus, Wand2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [selected, setSelected] = useState<string | null>("n1");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["n1"]));
  const [canvasMode, setCanvasMode] = useState<"navigate" | "select">("navigate");
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusPicked, setFocusPicked] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<SceneStatus>>(
    () => new Set<SceneStatus>(["final", "in-review", "draft"]),
  );
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const selBoxOriginRef = useRef<{ cx: number; cy: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const blockSeq = useRef(0); // monotonic ids for added content blocks

  const findNode = (id: string) => nodes.find((n) => n.id === id)!;

  // Selecting a node. additive=true (shift-click) toggles membership in the
  // multi-selection without changing the inspector's focused node.
  const selectNode = (id: string, additive = false) => {
    if (additive) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelected(id);
      setSelectedIds(new Set([id]));
      setInspectorOpen(true);
    }
  };

  // --- Inspect-panel updaters ----------------------------------------------
  const patchNode = (id: string, patch: Partial<SlideNode>) =>
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const setStatus = (id: string, status: SceneStatus) =>
    patchNode(id, { status });
  const setRole = (id: string, role: SceneRole) => patchNode(id, { role });
  const toggleLock = (id: string) =>
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, locked: !n.locked } : n)),
    );
  const addBlock = (id: string, type: ComponentType) => {
    blockSeq.current += 1;
    const block: ContentBlock = {
      id: `${id}-b-${blockSeq.current}`,
      type,
      label: type,
    };
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, blocks: [...(n.blocks ?? []), block] } : n,
      ),
    );
  };
  const removeBlock = (id: string, blockId: string) =>
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id
          ? { ...n, blocks: (n.blocks ?? []).filter((b) => b.id !== blockId) }
          : n,
      ),
    );
  // Relation lives on the edge into this node; editing it updates the canvas label.
  const setRelation = (toId: string, relation: EdgeRelation) =>
    setEdges((es) => es.map((e) => (e.to === toId ? { ...e, relation } : e)));

  const selectedNode = selected
    ? (nodes.find((n) => n.id === selected) ?? null)
    : null;
  const parentEdge = selected
    ? edges.find((e) => e.to === selected)
    : undefined;

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

  // Auto-tidy: reformat the tree (top-down by depth) IN PLACE — keep it
  // centered where it already is so the camera/view doesn't move.
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

    // Lay the tidy tree out around the origin first.
    const raw = nodes.map((n) => {
      const d = depth.get(n.id) ?? 0;
      const level = levels.get(d) ?? [n.id];
      const idx = level.indexOf(n.id);
      const w = n.width ?? 320;
      return {
        id: n.id,
        x: (idx - (level.length - 1) / 2) * hGap - w / 2,
        y: d * vGap,
        w,
        h: n.height ?? 180,
      };
    });

    // Anchor the layout to the ROOT's current position: the root stays
    // exactly where it is, only the format below it changes. Nothing the
    // user is looking at jumps, and the camera never moves.
    const byId = new Map(raw.map((r) => [r.id, r]));
    const rootNode = nodes.find((n) => !hasParent.has(n.id)) ?? nodes[0];
    const rootRaw = rootNode ? byId.get(rootNode.id) : undefined;
    const dx = rootNode && rootRaw ? rootNode.x - rootRaw.x : 0;
    const dy = rootNode && rootRaw ? rootNode.y - rootRaw.y : 0;
    setNodes((ns) =>
      ns.map((n) => {
        const r = byId.get(n.id);
        return r ? { ...n, x: r.x + dx, y: r.y + dy } : n;
      }),
    );
  };

  // Outline click → select the node and fly the canvas to center it.
  const jumpTo = (id: string) => {
    selectNode(id);
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

    if (canvasMode === "navigate") {
      setSelected(null);
      setSelectedIds(new Set());
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
    } else {
      // Select mode — draw a marquee box in canvas space.
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const toCanvas = (cx: number, cy: number) => ({
        x: (cx - rect.left - pan.x) / zoom,
        y: (cy - rect.top - pan.y) / zoom,
      });
      const origin = toCanvas(e.clientX, e.clientY);
      selBoxOriginRef.current = { cx: origin.x, cy: origin.y };
      setSelectionBox({ x1: origin.x, y1: origin.y, x2: origin.x, y2: origin.y });

      const move = (ev: MouseEvent) => {
        if (!selBoxOriginRef.current) return;
        const cur = toCanvas(ev.clientX, ev.clientY);
        const bx1 = Math.min(selBoxOriginRef.current.cx, cur.x);
        const by1 = Math.min(selBoxOriginRef.current.cy, cur.y);
        const bx2 = Math.max(selBoxOriginRef.current.cx, cur.x);
        const by2 = Math.max(selBoxOriginRef.current.cy, cur.y);
        setSelectionBox({ x1: selBoxOriginRef.current.cx, y1: selBoxOriginRef.current.cy, x2: cur.x, y2: cur.y });
        const hits = nodes
          .filter((n) => {
            const nw = n.width ?? 320;
            const nh = n.height ?? 180;
            return n.x < bx2 && n.x + nw > bx1 && n.y < by2 && n.y + nh > by1;
          })
          .map((n) => n.id);
        setSelectedIds(new Set(hits));
      };
      const up = (ev: MouseEvent) => {
        if (selBoxOriginRef.current) {
          const cur = toCanvas(ev.clientX, ev.clientY);
          const bx1 = Math.min(selBoxOriginRef.current.cx, cur.x);
          const by1 = Math.min(selBoxOriginRef.current.cy, cur.y);
          const bx2 = Math.max(selBoxOriginRef.current.cx, cur.x);
          const by2 = Math.max(selBoxOriginRef.current.cy, cur.y);
          if (bx2 - bx1 <= 4 && by2 - by1 <= 4) {
            // Plain click (no drag) → deselect all
            setSelected(null);
            setSelectedIds(new Set());
          } else {
            const hits = nodes
              .filter((n) => {
                const nw = n.width ?? 320;
                const nh = n.height ?? 180;
                return n.x < bx2 && n.x + nw > bx1 && n.y < by2 && n.y + nh > by1;
              })
              .map((n) => n.id);
            setSelectedIds(new Set(hits));
            if (hits.length === 1) {
              setSelected(hits[0]);
              setInspectorOpen(true);
            }
          }
        }
        selBoxOriginRef.current = null;
        setSelectionBox(null);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    }
  };

  // Frame a set of nodes so the whole tree fits in the viewport, with a
  // generous margin. The zoom is snapped DOWN to a multiple of 5%.
  const frameNodes = (list: SlideNode[]) => {
    const vp = viewportRef.current;
    if (!vp || list.length === 0) return;
    const pad = 200; // generous margin → zooms out more
    const minX = Math.min(...list.map((n) => n.x));
    const minY = Math.min(...list.map((n) => n.y));
    const maxX = Math.max(...list.map((n) => n.x + (n.width ?? 320)));
    const maxY = Math.max(...list.map((n) => n.y + (n.height ?? 180)));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const raw = Math.min(
      1,
      (vp.clientWidth - pad * 2) / spanX,
      (vp.clientHeight - pad * 2) / spanY,
    );
    // snap down to a multiple of 5%, clamped to [30%, 100%]
    const pct = Math.min(100, Math.max(30, Math.floor((raw * 100) / 5) * 5));
    const z = pct / 100;
    setZoom(z);
    setPan({
      x: vp.clientWidth / 2 - (minX + spanX / 2) * z,
      y: vp.clientHeight / 2 - (minY + spanY / 2) * z,
    });
  };

  // Fit-to-view: move/zoom so the entire tree is visible (no rearrange).
  const fitToView = () => frameNodes(nodes);

  // Zoom in/out in 5% steps, snapped to multiples of 5.
  const zoomBy = (dir: number) => {
    const pct = Math.round((zoom * 100) / 5) * 5;
    setZoom(Math.min(200, Math.max(30, pct + dir * 5)) / 100);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Canvas */}
      <div
        ref={viewportRef}
        className={`flex-1 relative overflow-hidden dot-grid ${canvasMode === "navigate" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
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
                selected={selectedIds.has(n.id)}
                dimmed={isNodeDimmed(n)}
                onSelect={(shiftKey) => selectNode(n.id, shiftKey)}
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

          {/* Marquee selection box (canvas space) */}
          {selectionBox && (
            <div
              className="absolute pointer-events-none border border-(--accent) bg-accent-soft opacity-60"
              style={{
                left: Math.min(selectionBox.x1, selectionBox.x2),
                top: Math.min(selectionBox.y1, selectionBox.y2),
                width: Math.abs(selectionBox.x2 - selectionBox.x1),
                height: Math.abs(selectionBox.y2 - selectionBox.y1),
              }}
            />
          )}
        </div>

        {/* Left tool rail */}
        <GraphToolRail
          canvasMode={canvasMode}
          onSetMode={setCanvasMode}
          outlineOpen={outlineOpen}
          filterOpen={filterOpen}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          focusPicked={focusPicked}
          onToggleFocus={() => setFocusPicked((v) => !v)}
          minimapOpen={minimapOpen}
          onToggleMinimap={() => setMinimapOpen((v) => !v)}
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

        {/* Right scene panel (Chat / Inspect / Argument) */}
        {inspectorOpen && (
          <ScenePanel
            node={selectedNode}
            selectedCount={selectedIds.size}
            parentRelation={parentEdge?.relation ?? null}
            hasParent={Boolean(parentEdge)}
            onClose={() => setInspectorOpen(false)}
            onChangeStatus={setStatus}
            onChangeRole={setRole}
            onChangeRelation={setRelation}
            onToggleLock={toggleLock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
          />
        )}

        {/* Floating zoom pill */}
        <TooltipProvider
          delayDuration={100}
          skipDelayDuration={0}
          disableHoverableContent
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-1 bg-chrome border border-border rounded-full shadow-[var(--sh-v)] px-1.5 py-1.5"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ToolBtn label="Zoom out" tip="Zoom out" onClick={() => zoomBy(-1)}>
              <Minus size={14} />
            </ToolBtn>
            <span className="px-2 text-[12px] font-mono w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <ToolBtn label="Zoom in" tip="Zoom in" onClick={() => zoomBy(1)}>
              <Plus size={14} />
            </ToolBtn>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolBtn
              label="Auto-tidy"
              tip="Auto-tidy — rearrange the tree neatly"
              onClick={autoTidy}
            >
              <Wand2 size={14} />
            </ToolBtn>
            <ToolBtn
              label="Fit to view"
              tip="Fit to view — zoom so the whole tree is visible"
              onClick={fitToView}
            >
              <Maximize2 size={14} />
            </ToolBtn>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  label,
  tip,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  tip: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-canvas/60 transition-colors text-ink"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="bg-ink text-white border-0 font-medium"
      >
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
