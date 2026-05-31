import { useEffect, useRef, useState } from "react";
import { loadSlides } from "@/lib/firestore-slides";
import { GraphMapPanel } from "./GraphMapPanel";
import { GraphToolRail } from "./GraphToolRail";
import { StatusFilterPanel } from "./StatusFilterPanel";
import { DraggablePanel } from "./DraggablePanel";
import { Minimap } from "./Minimap";
import { ScenePanel } from "./ScenePanel";
import { GhostCard } from "./GhostCard";
import { GenerateNode } from "./GenerateNode";
import { ContentGraphView } from "./ContentGraphView";
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
  type ContentBlock,
} from "@/lib/projektor-data";
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
  initialNodes?: SlideNode[];
  initialEdges?: Edge[];
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

// All nodes that can reach `id` (its ancestors). Re-pointing an arrow at one of
// these would create a cycle, so they're blocked as drop targets.
function ancestorsOf(id: string, es: Edge[]): Set<string> {
  const parentsMap = new Map<string, string[]>();
  es.forEach((e) =>
    parentsMap.set(e.to, [...(parentsMap.get(e.to) ?? []), e.from]),
  );
  const out = new Set<string>();
  const stack = [...(parentsMap.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (out.has(cur)) continue;
    out.add(cur);
    stack.push(...(parentsMap.get(cur) ?? []));
  }
  return out;
}

export function BoardView({
  zoom,
  setZoom,
  onOpenEditor,
  initialNodes,
  initialEdges,
}: Props) {
  const [nodes, setNodes] = useState<SlideNode[]>(
    initialNodes ?? INITIAL_NODES,
  );
  const [edges, setEdges] = useState<Edge[]>(initialEdges ?? INITIAL_EDGES);
  const [selected, setSelected] = useState<string | null>("n1");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["n1"]));
  const [canvasMode, setCanvasMode] = useState<"navigate" | "select">(
    "navigate",
  );
  const [selectionBox, setSelectionBox] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [contentSceneId, setContentSceneId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusPicked, setFocusPicked] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<SceneStatus>>(
    () => new Set<SceneStatus>(["final", "in-review", "draft"]),
  );
  // Active wire drag. `parent` (the tail/source) stays pinned; the arrowhead
  // follows the cursor (canvas coords) hunting for a child. Two modes:
  //   • "repoint" — moving an existing edge's head (edgeIndex set).
  //   • "create"  — drawing a brand-new edge from `parent` (edgeIndex null).
  // `invalid` = nodes that can't be the child (parent itself, its existing
  // children → dup, any ancestor → cycle). `hover` = valid node under cursor.
  const [rewire, setRewire] = useState<{
    mode: "repoint" | "create";
    edgeIndex: number | null;
    parent: string;
    invalid: Set<string>;
    cursor: { x: number; y: number };
    hover: string | null;
  } | null>(null);
  // Real rendered card heights (canvas units), reported by each card. Used so
  // edges/affordances anchor flush to a card's visible bottom instead of the
  // fixed node.height guess (which left a gap and skewed arrow length).
  const [heights, setHeights] = useState<Record<string, number>>({});
  const reportHeight = (id: string, h: number) =>
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  // Edge selection/hover (by index) for deleting a single connection.
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const selBoxOriginRef = useRef<{ cx: number; cy: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const blockSeq = useRef(0); // monotonic ids for added content blocks
  const genSeq = useRef(0); // monotonic ids for generated candidate nodes
  const newSeq = useRef(0); // monotonic ids for blank scenes added from the rail

  // Load slides from Firestore on mount so the graph reflects the live database.
  // Only runs when using the default board (no custom deck passed via props) —
  // if a custom deck was loaded (e.g. from the chunker), its nodes/edges must
  // not be overwritten. frameNodes auto-fits the viewport so every node,
  // including the rightmost leaf and its Generate-next button, is visible.
  useEffect(() => {
    if (initialNodes !== INITIAL_NODES) return;
    loadSlides()
      .then((remote) => {
        if (remote && remote.length > 0) {
          setNodes(remote);
          setTimeout(() => frameNodes(remote), 0);
        }
      })
      .catch((err) => console.error("[BoardView] Failed to load slides:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findNode = (id: string) => nodes.find((n) => n.id === id)!;

  // Card height: measured if known, else the node's declared height fallback.
  const heightOf = (n: SlideNode) => heights[n.id] ?? n.height ?? 180;
  // Edge anchor on a node's side, using the measured height for vertical edges.
  const anchorOf = (
    n: SlideNode,
    side: "right" | "left" | "top" | "bottom",
  ) => {
    const w = n.width ?? 320;
    const h = heightOf(n);
    if (side === "right") return { x: n.x + w, y: n.y + h / 2 };
    if (side === "left") return { x: n.x, y: n.y + h / 2 };
    if (side === "top") return { x: n.x + w / 2, y: n.y };
    return { x: n.x + w / 2, y: n.y + h };
  };

  // A node's incoming edges (by index). Used to fan multiple arrows across its
  // top edge so they don't stack on one point (and neither do their handles).
  const incomingByChild = new Map<string, number[]>();
  edges.forEach((e, i) => {
    const list = incomingByChild.get(e.to);
    if (list) list.push(i);
    else incomingByChild.set(e.to, [i]);
  });
  // Where edge `i`'s arrowhead lands on its child's top edge: centered for a
  // lone arrow, evenly spread when the child has several incoming arrows.
  const topAnchorOf = (edgeIndex: number) => {
    const e = edges[edgeIndex];
    const child = findNode(e.to);
    const list = incomingByChild.get(e.to) ?? [edgeIndex];
    const k = Math.max(0, list.indexOf(edgeIndex));
    const w = child.width ?? 320;
    return { x: child.x + (w * (k + 1)) / (list.length + 1), y: child.y };
  };

  // Selecting a node. additive=true (shift-click) toggles membership in the
  // multi-selection. A plain click focuses it in the inspector. Either way it
  // drops any edge selection (node and edge selection are mutually exclusive).
  const selectNode = (id: string, additive = false) => {
    setSelectedEdge(null);
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

  // Remove a single connection (both scenes stay). Used by the edge × button
  // and Delete-when-an-edge-is-selected.
  const deleteEdge = (index: number) => {
    setEdges((es) => es.filter((_, i) => i !== index));
    setSelectedEdge(null);
    setHoverEdge(null);
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
  const addBlock = (id: string, draft: Omit<ContentBlock, "id">) => {
    blockSeq.current += 1;
    const block: ContentBlock = { id: `${id}-b-${blockSeq.current}`, ...draft };
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, blocks: [...(n.blocks ?? []), block] } : n,
      ),
    );
  };
  const moveBlock = (id: string, blockId: string, cx: number, cy: number) =>
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id
          ? {
              ...n,
              blocks: (n.blocks ?? []).map((b) =>
                b.id === blockId ? { ...b, cx, cy } : b,
              ),
            }
          : n,
      ),
    );
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

  // Permanently delete just this node (any node — committed or a discarded
  // ghost). Its connecting arrows are pruned; children keep their place and
  // become unparented (no cascade, no auto-tidy).
  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
    setSelectedEdge(null); // indices shift when edges are removed
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selected === id) setSelected(null);
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
    if (canvasMode === "navigate") {
      setSelected(null);
      setSelectedIds(new Set());
      setSelectedEdge(null);
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
      setSelectionBox({
        x1: origin.x,
        y1: origin.y,
        x2: origin.x,
        y2: origin.y,
      });

      const move = (ev: MouseEvent) => {
        if (!selBoxOriginRef.current) return;
        const cur = toCanvas(ev.clientX, ev.clientY);
        const bx1 = Math.min(selBoxOriginRef.current.cx, cur.x);
        const by1 = Math.min(selBoxOriginRef.current.cy, cur.y);
        const bx2 = Math.max(selBoxOriginRef.current.cx, cur.x);
        const by2 = Math.max(selBoxOriginRef.current.cy, cur.y);
        setSelectionBox({
          x1: selBoxOriginRef.current.cx,
          y1: selBoxOriginRef.current.cy,
          x2: cur.x,
          y2: cur.y,
        });
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
                return (
                  n.x < bx2 && n.x + nw > bx1 && n.y < by2 && n.y + nh > by1
                );
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

  // Latest pan/zoom for the native wheel listener (attached once, reads refs to
  // avoid re-binding on every transform change).
  const viewRef = useRef({ pan, zoom });
  viewRef.current = { pan, zoom };

  // Ctrl/⌘ + wheel and trackpad pinch (macOS pinch fires wheel events with
  // ctrlKey set) zoom continuously toward the cursor. The listener is native +
  // non-passive so preventDefault stops the browser's own page-zoom; React's
  // onWheel can't (React 19 registers wheel as passive). Plain scroll is left
  // alone — panning stays drag-only.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ZOOM_SENSITIVITY = 0.009;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { pan: p, zoom: z } = viewRef.current;
      const next = Math.min(
        2,
        Math.max(0.3, z * Math.exp(-e.deltaY * ZOOM_SENSITIVITY)),
      );
      if (next === z) return;
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = (mx - p.x) / z; // canvas point under the pointer
      const cy = (my - p.y) / z;
      setZoom(Number(next.toFixed(4)));
      setPan({ x: mx - cx * next, y: my - cy * next });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [setZoom]);

  // Delete/Backspace removes the selected edge. Guarded so it never fires while
  // the board is hidden (offsetParent null under Slides view) or while typing.
  useEffect(() => {
    if (selectedEdge == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!viewportRef.current?.offsetParent) return; // board not visible
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      e.preventDefault();
      deleteEdge(selectedEdge);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEdge]);

  // Screen (client) point → canvas coords, inverting the pan/zoom transform.
  const toCanvas = (clientX: number, clientY: number) => {
    const vp = viewportRef.current!;
    const r = vp.getBoundingClientRect();
    const { pan: p, zoom: z } = viewRef.current;
    return { x: (clientX - r.left - p.x) / z, y: (clientY - r.top - p.y) / z };
  };

  // The valid node under a screen point during a rewire drag, or null.
  const dropTargetAt = (
    clientX: number,
    clientY: number,
    invalid: Set<string>,
  ) => {
    const el = document.elementFromPoint(
      clientX,
      clientY,
    ) as HTMLElement | null;
    const id =
      el?.closest<HTMLElement>("[data-node-id]")?.dataset.nodeId ?? null;
    return id && !invalid.has(id) ? id : null;
  };

  // Drag an arrow's head (repoint) or pull a brand-new arrow off a node's
  // connector (create). The source/tail stays pinned to `source`; dropping on a
  // valid node sets/creates the edge. Node positions are left alone (no tidy).
  const beginWire = (
    opts: {
      mode: "repoint" | "create";
      edgeIndex: number | null;
      source: string;
    },
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedEdge(null); // edge indices may shift after this drag
    setHoverEdge(null);
    const { source } = opts;
    const invalid = ancestorsOf(source, edges);
    invalid.add(source); // no self-loop
    // The source's existing children (incl. the moved edge's current child) →
    // would duplicate, so they're not valid drops.
    edges.forEach((e2) => e2.from === source && invalid.add(e2.to));

    setRewire({
      mode: opts.mode,
      edgeIndex: opts.edgeIndex,
      parent: source,
      invalid,
      cursor: toCanvas(e.clientX, e.clientY),
      hover: null,
    });

    const move = (ev: MouseEvent) =>
      setRewire((r) =>
        r
          ? {
              ...r,
              cursor: toCanvas(ev.clientX, ev.clientY),
              hover: dropTargetAt(ev.clientX, ev.clientY, invalid),
            }
          : r,
      );

    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      const target = dropTargetAt(ev.clientX, ev.clientY, invalid);
      if (target) {
        if (opts.mode === "repoint" && opts.edgeIndex !== null) {
          const idx = opts.edgeIndex;
          setEdges((es) =>
            es.map((e2, i) => (i === idx ? { ...e2, to: target } : e2)),
          );
        } else {
          setEdges((es) => [...es, { from: source, to: target }]);
        }
      }
      setRewire(null);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // Drop a blank scene at the viewport center, unattached. The user wires it up
  // afterwards by dragging a connection onto it.
  const createSlide = () => {
    newSeq.current += 1;
    const vp = viewportRef.current;
    const w = 320;
    const h = 180;
    const cx = vp ? (vp.clientWidth / 2 - pan.x) / zoom : 1200;
    const cy = vp ? (vp.clientHeight / 2 - pan.y) / zoom : 400;
    const id = `new-${newSeq.current}`;
    const node: SlideNode = {
      id,
      index: nodes.length + 1,
      title: "New scene",
      kind: "title",
      status: "draft",
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      role: "claim",
      locked: false,
      blocks: [],
      state: "rendered",
      thumb: "title",
      candidates: [],
      activeDesignId: null,
    };
    setNodes((ns) => [...ns, node]);
    setSelected(id);
    setInspectorOpen(true);
  };

  // Drilling into a scene's content swaps the whole board for its content graph.
  const contentScene = contentSceneId
    ? (nodes.find((n) => n.id === contentSceneId) ?? null)
    : null;
  if (contentScene) {
    return (
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ContentGraphView
          scene={contentScene}
          onBack={() => setContentSceneId(null)}
          onAddBlock={addBlock}
          onRemoveBlock={removeBlock}
          onMoveBlock={moveBlock}
        />
      </div>
    );
  }

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
              if (rewire?.edgeIndex === i) return null; // rubber-band replaces it
              const a = anchorOf(findNode(e.from), "bottom");
              const b = topAnchorOf(i);
              const dim = isEdgeDimmed(e);
              const active = selectedEdge === i || hoverEdge === i;
              const d = buildPath(a, b);
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--accent)"
                    strokeOpacity={dim ? 0.2 : active ? 1 : 0.85}
                    strokeWidth={active ? 3 : 1.75}
                    strokeDasharray={e.dashed ? "5 4" : undefined}
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Invisible wide hit area: hover to reveal ×, click to select. */}
                  {!rewire && (
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onMouseEnter={() => setHoverEdge(i)}
                      onMouseLeave={() =>
                        setHoverEdge((h) => (h === i ? null : h))
                      }
                      onMouseDown={(ev) => ev.stopPropagation()}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelected(null);
                        setSelectedEdge(i);
                      }}
                    />
                  )}
                </g>
              );
            })}
            {/* Live rubber-band while re-wiring: tail stays pinned to the
                parent's bottom, arrowhead follows the cursor. */}
            {rewire &&
              (() => {
                const a = anchorOf(findNode(rewire.parent), "bottom");
                return (
                  <path
                    d={buildPath(a, rewire.cursor)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeOpacity={0.9}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })()}
            {/* Short connectors down to each leaf's Generate-next node */}
            {leafNodes.map((n) => {
              const cx = n.x + (n.width ?? 320) / 2;
              const y1 = n.y + heightOf(n);
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

          {/* Edge relation labels — hidden on the edge being hovered/selected,
              where the delete × takes their place. */}
          {edges.map((e, i) => {
            if (!e.relation || rewire?.edgeIndex === i) return null;
            if (hoverEdge === i || selectedEdge === i) return null;
            const a = anchorOf(findNode(e.from), "bottom");
            const b = topAnchorOf(i);
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

          {/* Delete-edge × — appears at the midpoint on hover or when selected. */}
          {!rewire &&
            edges.map((e, i) => {
              if (hoverEdge !== i && selectedEdge !== i) return null;
              const a = anchorOf(findNode(e.from), "bottom");
              const b = topAnchorOf(i);
              return (
                <button
                  key={`edge-x-${i}`}
                  type="button"
                  title="Delete this connection"
                  onMouseEnter={() => setHoverEdge(i)}
                  onMouseLeave={() => setHoverEdge((h) => (h === i ? null : h))}
                  onMouseDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    deleteEdge(i);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-[22px] h-[22px] rounded-full bg-white border border-border shadow-[var(--sh-v)] text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors"
                  style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              );
            })}

          {/* Nodes */}
          {nodes.map((n) => {
            const onMove = (x: number, y: number) =>
              setNodes((ns) =>
                ns.map((m) => (m.id === n.id ? { ...m, x, y } : m)),
              );
            return (
              <div key={n.id} data-node data-node-id={n.id} className="group">
                {n.ghost ? (
                  <GhostCard
                    node={n}
                    selected={selectedIds.has(n.id)}
                    dimmed={isNodeDimmed(n)}
                    dropTarget={rewire?.hover === n.id}
                    onSelect={() => selectNode(n.id)}
                    onMove={onMove}
                    onAccept={() => acceptGhost(n.id)}
                    onDiscard={() => discardGhost(n.id)}
                    onReconsider={() => reconsiderGhost(n.id)}
                    onDelete={() => deleteNode(n.id)}
                    onMeasure={(h) => reportHeight(n.id, h)}
                    zoom={zoom}
                  />
                ) : (
                  <SlideCard
                    node={n}
                    selected={selectedIds.has(n.id)}
                    dimmed={isNodeDimmed(n)}
                    dropTarget={rewire?.hover === n.id}
                    onSelect={(shift) => selectNode(n.id, shift)}
                    onOpenEditor={() => onOpenEditor(n.id)}
                    onMove={onMove}
                    onMeasure={(h) => reportHeight(n.id, h)}
                    zoom={zoom}
                  />
                )}
                {/* Connect port — appears on hover; drag to draw a new arrow
                    from this scene to another. Hidden while a wire is active. */}
                {!rewire && !n.ghost && (
                  <button
                    type="button"
                    title="Drag to connect this scene to another"
                    onMouseDown={(ev) =>
                      beginWire(
                        { mode: "create", edgeIndex: null, source: n.id },
                        ev,
                      )
                    }
                    className="absolute flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[var(--accent)] text-white border-2 border-white shadow-[var(--sh-v)] cursor-grab opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
                    style={{
                      left: n.x + (n.width ?? 320) / 2 - 11,
                      top: n.y + heightOf(n) - 11,
                    }}
                  >
                    <Plus size={13} strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Generate-next nodes — one per leaf, just below the card */}
          {leafNodes.map((n) => {
            const cx = n.x + (n.width ?? 320) / 2;
            const top = n.y + heightOf(n) + GEN_GAP;
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

          {/* Arrowhead grab handles — one per edge, sitting above each arrow's
              landing point (fanned, so multiple arrows into one node each get
              their own). Hidden during a drag so they never intercept the drop. */}
          {!rewire &&
            edges.map((e, i) => {
              const b = topAnchorOf(i);
              return (
                <div
                  key={`rewire-${i}`}
                  className="absolute rounded-full bg-[var(--accent)] border-2 border-white shadow-[var(--sh-v)] cursor-grab hover:scale-150 transition-transform"
                  style={{
                    // Floated above the node (on the incoming arrow) so it never
                    // sits on the card and steal node drag/selection.
                    left: b.x - 7,
                    top: b.y - 24,
                    width: 14,
                    height: 14,
                    opacity: isEdgeDimmed(e) ? 0.25 : 0.9,
                  }}
                  title="Drag to re-point this arrow at a new child"
                  onMouseDown={(ev) =>
                    beginWire(
                      { mode: "repoint", edgeIndex: i, source: e.from },
                      ev,
                    )
                  }
                />
              );
            })}

          {/* Marquee selection box (drawn in Select mode) */}
          {selectionBox && (
            <div
              className="absolute pointer-events-none rounded-sm"
              style={{
                left: Math.min(selectionBox.x1, selectionBox.x2),
                top: Math.min(selectionBox.y1, selectionBox.y2),
                width: Math.abs(selectionBox.x2 - selectionBox.x1),
                height: Math.abs(selectionBox.y2 - selectionBox.y1),
                border: "1.5px solid var(--accent)",
                background: "var(--accent-soft)",
                opacity: 0.5,
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
          onNewSlide={createSlide}
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
            onOpenContent={setContentSceneId}
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
