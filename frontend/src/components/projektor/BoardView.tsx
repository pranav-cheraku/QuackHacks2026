import { useRef, useState, useCallback } from "react";
import { GraphMapPanel } from "./GraphMapPanel";
import { GraphToolRail } from "./GraphToolRail";
import { StatusFilterPanel } from "./StatusFilterPanel";
import { DraggablePanel } from "./DraggablePanel";
import { Minimap } from "./Minimap";
import { SlideCard } from "./SlideCard";
import {
  INITIAL_NODES,
  INITIAL_EDGES,
  type SlideNode,
  type SlideCandidate,
  type Edge,
  type SceneStatus,
  type DesignStatus,
} from "@/lib/projektor-data";
import { generateSlideCandidates } from "@/lib/slideDesignAgent";
import { Maximize2, Minus, Plus, Wand2, X } from "lucide-react";
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
  onDesignApplied: (updatedNode: SlideNode) => void;
  initialNodes?: SlideNode[];
  initialEdges?: Edge[];
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

export function BoardView({ zoom, setZoom, onOpenEditor, onDesignApplied, initialNodes, initialEdges }: Props) {
  const [nodes, setNodes] = useState<SlideNode[]>(initialNodes ?? INITIAL_NODES);
  const [edges] = useState<Edge[]>(initialEdges ?? INITIAL_EDGES);
  const [selected, setSelected] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusPicked, setFocusPicked] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<SceneStatus>>(
    () => new Set<SceneStatus>(["final", "in-review", "draft"]),
  );
  // Slide-design agent state
  const [designingNodeId, setDesigningNodeId] = useState<string | null>(null);
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // ── Slide-design agent ──────────────────────────────────────────────────────
  // Double-clicking a bucket triggers generateSlideCandidates, then shows the
  // candidate-picker overlay. On pick, the node transitions to "designed" and
  // the editor is opened for that scene.
  const handleDesignBucket = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // If candidates already exist, go straight to the picker
    if (node.candidates?.length) {
      setDesigningNodeId(nodeId);
      return;
    }

    // SLIDE-DESIGN AGENT CALL (swap point — see src/lib/slideDesignAgent.ts)
    setGeneratingNodeId(nodeId);
    try {
      const candidates = await generateSlideCandidates(node);
      setNodes((ns) =>
        ns.map((n) => (n.id === nodeId ? { ...n, candidates } : n)),
      );
      setDesigningNodeId(nodeId);
    } catch (err) {
      console.error("[slide-design] Failed to generate candidates:", err);
    } finally {
      setGeneratingNodeId(null);
    }
  }, [nodes]);

  const handlePickCandidate = useCallback((nodeId: string, candidate: SlideCandidate) => {
    const updated: Partial<SlideNode> = {
      elements: candidate.elements,
      activeDesignId: candidate.id,
      designStatus: "designed" as DesignStatus,
    };
    let updatedNode: SlideNode | undefined;
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== nodeId) return n;
        updatedNode = { ...n, ...updated };
        return updatedNode;
      }),
    );
    setDesigningNodeId(null);
    // GRAPH SYNC: propagate design back to Projektor.deck so EditorView
    // (seeded from deck) receives the realized layout on next mode switch.
    if (updatedNode) {
      onDesignApplied(updatedNode);
      // Open the slide editor for the newly designed scene
      onOpenEditor(nodeId);
    }
  }, [onDesignApplied, onOpenEditor]);

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
                isGeneratingDesign={generatingNodeId === n.id}
                onSelect={() => setSelected(n.id)}
                onOpenEditor={() => onOpenEditor(n.id)}
                onDesignBucket={() => handleDesignBucket(n.id)}
                onMove={(x, y) =>
                  setNodes((ns) =>
                    ns.map((m) => (m.id === n.id ? { ...m, x, y } : m)),
                  )
                }
                zoom={zoom}
              />
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

      {/* ── Candidate-picker overlay ──────────────────────────────────────────
           Shows when a bucket has been designed and the user needs to pick a layout.
           CANDIDATE-PICKER UI: replace this minimal overlay with a richer gallery
           (slide thumbnail previews) when the design system is ready.
           For now: text labels + "Use this design" buttons. */}
      {designingNodeId && (() => {
        const node = nodes.find((n) => n.id === designingNodeId);
        const candidates = node?.candidates ?? [];
        return (
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-2xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.3)] w-[560px] max-h-[80vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div>
                  <div className="font-semibold text-[15px] text-ink">Choose a layout</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5 font-mono truncate max-w-[360px]">
                    {node?.title}
                  </div>
                </div>
                <button
                  onClick={() => setDesigningNodeId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-canvas/60 text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                {candidates.map((cand) => (
                  <button
                    key={cand.id}
                    data-no-drag
                    onClick={() => handlePickCandidate(designingNodeId, cand)}
                    className="group text-left rounded-xl border border-border bg-white hover:border-[color:var(--accent)] hover:shadow-[0_0_0_2px_var(--accent-soft)] transition-all overflow-hidden"
                  >
                    {/* Preview thumbnail — placeholder until SlideThumb renders elements */}
                    <div className="aspect-[16/9] bg-canvas/60 border-b border-border flex items-center justify-center text-muted-foreground text-[11px] font-mono">
                      {cand.label}
                    </div>
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink">{cand.label}</span>
                      <span className="text-[11px] text-[color:var(--accent)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Use this →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
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
