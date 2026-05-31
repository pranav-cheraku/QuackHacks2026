import { useRef, useState } from "react";
import { GraphMapPanel } from "./GraphMapPanel";
import { GraphToolRail } from "./GraphToolRail";
import { StatusFilterPanel } from "./StatusFilterPanel";
import { DraggablePanel } from "./DraggablePanel";
import { Minimap } from "./Minimap";
import { ScenePanel } from "./ScenePanel";
import { GhostCard } from "./GhostCard";
import { GenerateNode } from "./GenerateNode";
import { SlideCard } from "./SlideCard";
import {
  INITIAL_NODES,
  INITIAL_EDGES,
  type SlideNode,
  type Edge,
  type EdgeRelation,
  type SceneStatus,
  type SceneRole,
  type SceneKind,
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

// Placeholder candidate pool — stands in for the AI until a backend exists.
// Generating a fork pulls the next two from here (cycling).
const SUGGESTIONS: { title: string; rationale: string; kind: SceneKind }[] = [
  {
    title: "Why now — the urgency",
    rationale: "Follow it with the cost of waiting — it sharpens the ask.",
    kind: "problem",
  },
  {
    title: "The ask — what we need",
    rationale:
      "Go straight to the round size and use of funds while it's fresh.",
    kind: "title",
  },
  {
    title: "Proof in the numbers",
    rationale: "Lead with the metric that moved most — let the chart carry it.",
    kind: "data",
  },
  {
    title: "Who it's for",
    rationale: "Ground the story in one customer feeling the problem today.",
    kind: "problem",
  },
  {
    title: "The bigger vision",
    rationale: "Zoom out to the 10-year picture before landing the close.",
    kind: "title",
  },
  {
    title: "How it works",
    rationale: "Show the loop end-to-end so the 'how' is obvious.",
    kind: "problem",
  },
];

// Tidy tree layout: each leaf gets a horizontal slot; each parent is centered
// over its children; rows by depth. Anchored to the root's current position so
// the root stays put and the camera doesn't move. Pure — returns new nodes.
function tidyNodes(ns: SlideNode[], es: Edge[]): SlideNode[] {
  const childrenMap = new Map<string, string[]>();
  es.forEach((e) =>
    childrenMap.set(e.from, [...(childrenMap.get(e.from) ?? []), e.to]),
  );
  const hasParent = new Set(es.map((e) => e.to));
  const byId = new Map(ns.map((n) => [n.id, n]));
  const widthOf = (id: string) => byId.get(id)?.width ?? 320;
  const vGap = 300;
  const gap = 60;

  const centerX = new Map<string, number>();
  const yOf = new Map<string, number>();
  const seen = new Set<string>();
  let cursor = 0;

  const childIds = (id: string) =>
    (childrenMap.get(id) ?? [])
      .map((cid) => byId.get(cid))
      .filter((n): n is SlideNode => Boolean(n))
      .sort((a, b) => a.index - b.index)
      .map((n) => n.id);

  const place = (id: string, depth: number): number => {
    if (seen.has(id)) return centerX.get(id) ?? 0; // cycle guard
    seen.add(id);
    yOf.set(id, depth * vGap);
    const kids = childIds(id);
    if (kids.length === 0) {
      const cx = cursor + widthOf(id) / 2;
      cursor += widthOf(id) + gap;
      centerX.set(id, cx);
      return cx;
    }
    const kidCenters = kids.map((k) => place(k, depth + 1));
    const cx = (kidCenters[0] + kidCenters[kidCenters.length - 1]) / 2;
    centerX.set(id, cx);
    return cx;
  };

  const roots = ns
    .filter((n) => !hasParent.has(n.id))
    .sort((a, b) => a.index - b.index);
  (roots.length ? roots : ns.slice(0, 1)).forEach((r) => place(r.id, 0));
  ns.forEach((n) => place(n.id, 0)); // any orphans

  // Anchor the root's top-left to where it already is.
  const root = roots[0] ?? ns[0];
  const rootNewLeft = root
    ? (centerX.get(root.id) ?? 0) - widthOf(root.id) / 2
    : 0;
  const dx = root ? root.x - rootNewLeft : 0;
  const dy = root ? root.y - (yOf.get(root.id) ?? 0) : 0;

  return ns.map((n) => {
    const cx = centerX.get(n.id);
    if (cx == null) return n;
    return {
      ...n,
      x: cx - widthOf(n.id) / 2 + dx,
      y: (yOf.get(n.id) ?? 0) + dy,
    };
  });
}

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const blockSeq = useRef(0); // monotonic ids for added content blocks
  const genSeq = useRef(0); // monotonic ids for generated candidate nodes

  const findNode = (id: string) => nodes.find((n) => n.id === id)!;

  // Selecting a node always (re)opens the inspector on it.
  const selectNode = (id: string) => {
    setSelected(id);
    setInspectorOpen(true);
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

  // --- Ghost (suggested branch) actions ------------------------------------
  // Accept = pick this fork: promote it to a committed scene + solidify its
  // edge, and dim the sibling candidates (same parent) — rejected-but-revisitable.
  const acceptGhost = (id: string) => {
    const parentId = edges.find((e) => e.to === id)?.from;
    const siblingGhostIds = parentId
      ? nodes
          .filter(
            (n) =>
              n.ghost &&
              n.id !== id &&
              edges.some((e) => e.from === parentId && e.to === n.id),
          )
          .map((n) => n.id)
      : [];
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id === id) return { ...n, ghost: false, discarded: false };
        if (siblingGhostIds.includes(n.id)) return { ...n, discarded: true };
        return n;
      }),
    );
    setEdges((es) =>
      es.map((e) => (e.to === id ? { ...e, dashed: false } : e)),
    );
  };
  // Discard: keep it on the canvas but dimmed and revisitable (never deleted).
  const discardGhost = (id: string) => patchNode(id, { discarded: true });
  const reconsiderGhost = (id: string) => patchNode(id, { discarded: false });

  // Delete: remove the node (and any subtree under it) for good — unlike
  // Discard, there's no coming back. Re-tidies what's left.
  const deleteNode = (id: string) => {
    const toRemove = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      edges.forEach((e) => {
        if (toRemove.has(e.from) && !toRemove.has(e.to)) {
          toRemove.add(e.to);
          grew = true;
        }
      });
    }
    const nextNodes = nodes.filter((n) => !toRemove.has(n.id));
    const nextEdges = edges.filter(
      (e) => !toRemove.has(e.from) && !toRemove.has(e.to),
    );
    setEdges(nextEdges);
    setNodes(tidyNodes(nextNodes, nextEdges));
    if (selected && toRemove.has(selected)) setSelected(null);
  };

  const selectedNode = selected
    ? (nodes.find((n) => n.id === selected) ?? null)
    : null;
  const parentEdge = selected
    ? edges.find((e) => e.to === selected)
    : undefined;

  // A node dims when it's off the picked path (focus), filtered out by status,
  // or a discarded (rejected-but-revisitable) suggested branch.
  const isNodeDimmed = (n: SlideNode) =>
    (focusPicked && !PICKED_PATH.has(n.id)) ||
    !activeStatuses.has(n.status) ||
    Boolean(n.discarded);
  const isEdgeDimmed = (e: Edge) =>
    isNodeDimmed(findNode(e.from)) || isNodeDimmed(findNode(e.to));

  // A committed leaf slide carries a "Generate next" node just below it — the
  // affordance that forks the next two candidates. Ghosts can't generate until
  // they're accepted (picking unlocks Generate next); internal and discarded
  // nodes don't show it either.
  const parentIds = new Set(edges.map((e) => e.from));
  const leafNodes = nodes.filter(
    (n) => !parentIds.has(n.id) && !n.discarded && !n.ghost,
  );
  const GEN_GAP = 32; // gap between a card's bottom and its Generate-next node

  const toggleStatus = (s: SceneStatus) =>
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  // Auto-tidy: reflow the tree into a clean layered layout, in place.
  const autoTidy = () => setNodes((ns) => tidyNodes(ns, edges));

  // Generate: spawn two AI candidate options below a card, then tidy so the
  // growing tree stays readable. Works on any card — committed or ghost — so
  // the possibility tree expands by clicking Generate, fork after fork.
  const generateOptions = (parentId: string) => {
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return;
    const maxIndex = nodes.reduce((m, n) => Math.max(m, n.index), 0);
    const k = genSeq.current;
    genSeq.current += 2;
    const picks = [
      SUGGESTIONS[k % SUGGESTIONS.length],
      SUGGESTIONS[(k + 1) % SUGGESTIONS.length],
    ];
    const newGhosts: SlideNode[] = picks.map((p, i) => ({
      id: `gen-${genSeq.current}-${i}`,
      index: maxIndex + 1 + i,
      title: p.title,
      kind: p.kind,
      status: "draft",
      ghost: true,
      rationale: p.rationale,
      // Rough position; tidyNodes overrides it. Required by the type.
      x: parent.x,
      y: parent.y + (parent.height ?? 180) + 300,
      width: 280,
      height: 168,
      state: "ingredient",
      thumb: "list",
      elements: [],
      candidates: [],
      activeDesignId: null,
    }));
    const newEdges: Edge[] = newGhosts.map((g) => ({
      from: parentId,
      to: g.id,
      relation: "sequence",
      dashed: true,
    }));
    const nextEdges = [...edges, ...newEdges];
    setEdges(nextEdges);
    setNodes(tidyNodes([...nodes, ...newGhosts], nextEdges));
    selectNode(parentId);
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
            {/* Short connectors down to each leaf's Generate-next node */}
            {leafNodes.map((n) => {
              const cx = n.x + (n.width ?? 320) / 2;
              const y1 = n.y + (n.height ?? 180);
              const y2 = y1 + GEN_GAP;
              return (
                <path
                  key={`gen-arrow-${n.id}`}
                  d={`M ${cx} ${y1} L ${cx} ${y2}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeOpacity={isNodeDimmed(n) ? 0.2 : 0.55}
                  strokeWidth="1.75"
                  strokeDasharray="5 4"
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
          {nodes.map((n) => {
            const onMove = (x: number, y: number) =>
              setNodes((ns) =>
                ns.map((m) => (m.id === n.id ? { ...m, x, y } : m)),
              );
            return (
              <div key={n.id} data-node>
                {n.ghost ? (
                  <GhostCard
                    node={n}
                    selected={selected === n.id}
                    dimmed={isNodeDimmed(n)}
                    onSelect={() => selectNode(n.id)}
                    onMove={onMove}
                    onAccept={() => acceptGhost(n.id)}
                    onDiscard={() => discardGhost(n.id)}
                    onReconsider={() => reconsiderGhost(n.id)}
                    onDelete={() => deleteNode(n.id)}
                    zoom={zoom}
                  />
                ) : (
                  <SlideCard
                    node={n}
                    selected={selected === n.id}
                    dimmed={isNodeDimmed(n)}
                    onSelect={() => selectNode(n.id)}
                    onOpenEditor={() => onOpenEditor(n.id)}
                    onMove={onMove}
                    zoom={zoom}
                  />
                )}
              </div>
            );
          })}

          {/* Generate-next nodes — one per leaf, just below the card */}
          {leafNodes.map((n) => {
            const cx = n.x + (n.width ?? 320) / 2;
            const top = n.y + (n.height ?? 180) + GEN_GAP;
            return (
              <div
                key={`gen-node-${n.id}`}
                data-node
                className="absolute"
                style={{ left: cx - 84, top }}
              >
                <GenerateNode
                  onClick={() => generateOptions(n.id)}
                  dimmed={isNodeDimmed(n)}
                />
              </div>
            );
          })}
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

        {/* Right scene panel (Chat / Inspect / Argument) */}
        {inspectorOpen && (
          <ScenePanel
            node={selectedNode}
            parentRelation={parentEdge?.relation ?? null}
            hasParent={Boolean(parentEdge)}
            onClose={() => setInspectorOpen(false)}
            onChangeStatus={setStatus}
            onChangeRole={setRole}
            onChangeRelation={setRelation}
            onToggleLock={toggleLock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            onAccept={acceptGhost}
            onDiscard={discardGhost}
            onReconsider={reconsiderGhost}
            onDelete={deleteNode}
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
