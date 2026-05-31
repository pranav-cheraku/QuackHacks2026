import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import type React from "react";
import {
  Undo2, Redo2, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Type, ImageIcon, Square, ChevronDown,
  Plus, Sparkles,
  Paperclip, Mic, Send, LayoutTemplate,
  Layers, Grid3x3, Trash2, Copy,
} from "lucide-react";
import type { SlideNode, Edge } from "@/lib/projektor-data";
import { SlideThumb } from "./SlideThumb";
import { GridOverlay } from "./GridOverlay";
import {
  collectLeaves, applySlideEditOp, emptyRoot, deepCloneWithNewIds,
  makeTextLeaf, makeShapeLeaf, makeImageLeaf, makeLeafId,
} from "@/lib/ir";
import type { LayoutNode, LeafNode, SlideEditOp, TextBlockStyle, ShapeBlockStyle } from "@/lib/ir";
import { gridToCSS, GRID_COLS, GRID_ROWS, snap, SNAP_STEP } from "@/lib/grid";
import type { GridPlacement } from "@/lib/grid";
import { INITIAL_IR_SLIDES } from "@/lib/initial-slides";
import { SLIDE_CANDIDATES } from "@/lib/slide-candidates";
import { ZOOM_STEP, zoomBy } from "@/lib/viewport";

// ── Module-level helpers / constants ─────────────────────────────────────────
function toHex(c?: string): string {
  if (!c) return "#000000";
  if (c.startsWith("#")) return c;
  return "#000000"; // oklch/hsl fall back; CSS still renders the real color via style=
}

const WEIGHT_OPTIONS = [
  { label: "Thin",     value: 300 },
  { label: "Regular",  value: 400 },
  { label: "Medium",   value: 500 },
  { label: "SemiBold", value: 600 },
  { label: "Bold",     value: 700 },
  { label: "ExtraBold",value: 800 },
] as const;

// ─── Undo/redo history ────────────────────────────────────────────────────────
type History = { past: SlideNode[][]; present: SlideNode[]; future: SlideNode[][] };
type HistoryAction =
  | { type: "commit"; updater: (s: SlideNode[]) => SlideNode[] }
  | { type: "init";   slides: SlideNode[] }
  | { type: "undo" }
  | { type: "redo" };

function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case "init":
      return { past: [], present: action.slides, future: [] };
    case "commit":
      return {
        past: [...state.past.slice(-49), state.present],
        present: action.updater(state.present),
        future: [],
      };
    case "undo":
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future.slice(0, 49)],
      };
    case "redo":
      if (!state.future.length) return state;
      return {
        past: [...state.past.slice(-49), state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
  }
}

interface Props {
  // ── Shared deck (single source of truth) ─────────────────────────────────
  // Passed from index.tsx so both Graph View and Slide View project the same IR.
  nodes: SlideNode[];
  edges: Edge[];
  onDeckChange: (nodes: SlideNode[], edges: Edge[]) => void;
  deckLoaded: boolean; // true once Firestore hydration is complete
  // ─────────────────────────────────────────────────────────────────────────
  startNodeId: string | null;
  zoom: number;
  setZoom: (zoom: number) => void;
  isGridVisible: boolean;
  toggleGrid: () => void;
}
type RightTab = "agent" | "design" | "arrange";
type HandlePos = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null
  );
}

function reindexSlides(slides: SlideNode[]): SlideNode[] {
  return slides.map((slide, index) => ({ ...slide, index: index + 1 }));
}

function makeSceneId(): string {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── EditorView ───────────────────────────────────────────────────────────────
export function EditorView({
  nodes,
  edges: deckEdges,
  onDeckChange,
  deckLoaded,
  startNodeId,
  zoom,
  setZoom,
  isGridVisible,
  toggleGrid,
}: Props) {
  // ── History reducer — initialized from the shared deck (not Firestore directly) ──
  // SLIDE-DESIGN AGENT: `candidates` on each node = AI-generated layout alternatives
  // for that box's content. Currently populated from SLIDE_CANDIDATES (static fallback).
  // Gemini swap point: replace SLIDE_CANDIDATES[n.id] with the result of calling the
  // slide-design agent with n.blocks (box content) → candidate layouts.
  // Input: n.blocks[] (ContentBlock[]) — the graph node's raw content ingredients.
  // Output: SlideCandidate[] — rendered layout trees to surface in the Designs panel.
  const [{ past, present: slides, future }, dispatch] = useReducer(
    historyReducer,
    nodes,
    (initialNodes): History => ({
      past: [],
      present: initialNodes.map((n) => ({
        ...n,
        root:           n.root          ?? INITIAL_IR_SLIDES[n.id] ?? emptyRoot(n.id),
        candidates:     n.candidates    ?? SLIDE_CANDIDATES[n.id]  ?? [],
        activeDesignId: n.activeDesignId ?? SLIDE_CANDIDATES[n.id]?.[0]?.id ?? null,
      })),
      future: [],
    })
  );
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // GRAPH SYNC: edges live in the shared deck. Local copy is initialized from props;
  // when EditorView prunes edges (on deleteSlide) it writes back via onDeckChange.
  const [localEdges, setLocalEdges] = useState<Edge[]>(deckEdges);

  // Re-initialize the history when the deck is first loaded from Firestore (fires at
  // most once per session, guarded by hasInitialized). This ensures EditorView always
  // shows the same nodes as the graph — no divergent state.
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!deckLoaded || hasInitialized.current) return;
    hasInitialized.current = true;
    const hydratedSlides = nodes.map((n) => ({
      ...n,
      root:           n.root          ?? INITIAL_IR_SLIDES[n.id] ?? emptyRoot(n.id),
      candidates:     n.candidates    ?? SLIDE_CANDIDATES[n.id]  ?? [],
      activeDesignId: n.activeDesignId ?? SLIDE_CANDIDATES[n.id]?.[0]?.id ?? null,
    }));
    dispatch({ type: "init", slides: hydratedSlides });
    setLocalEdges(deckEdges);
    setActiveId(hydratedSlides[0]?.id ?? "n1");
  // Run once when deckLoaded flips to true — nodes/deckEdges are stable at that point.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckLoaded]);

  // Write-back: whenever slides or edges change, push the updated deck to index.tsx.
  // index.tsx debounces and saves to Firestore; BoardView picks up layout changes via
  // externalSlides. This is the EDITOR → shared deck sync path.
  const onDeckChangeRef = useRef(onDeckChange);
  onDeckChangeRef.current = onDeckChange;
  const deckSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (deckSyncTimerRef.current) clearTimeout(deckSyncTimerRef.current);
    deckSyncTimerRef.current = setTimeout(() => {
      onDeckChangeRef.current(slides, localEdges);
    }, 300);
    return () => { if (deckSyncTimerRef.current) clearTimeout(deckSyncTimerRef.current); };
  }, [slides, localEdges]);

  const [activeId, setActiveId] = useState(() => startNodeId ?? nodes[0]?.id ?? "n1");
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [editingElId, setEditingElId] = useState<string | null>(null);
  const [railSelectionActive, setRailSelectionActive] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("agent");
  const slideRef = useRef<HTMLDivElement>(null);
  const lastStartNodeIdRef = useRef<string | null>(startNodeId);

  const activeSlide = slides.find((s) => s.id === activeId) ?? slides[0];
  const selectedLeaf = collectLeaves(activeSlide?.root ?? emptyRoot("")).find((l) => l.id === selectedElId) ?? null;

  // Type-narrowed helpers for toolbar/ArrangePanel
  const textBlock  = selectedLeaf?.block.role === "text"  ? selectedLeaf.block : null;
  const shapeBlock = selectedLeaf?.block.role === "shape" ? selectedLeaf.block : null;

  useEffect(() => {
    if (startNodeId === lastStartNodeIdRef.current) return;
    lastStartNodeIdRef.current = startNodeId;
    if (!startNodeId || !slides.some((s) => s.id === startNodeId)) return;
    setActiveId(startNodeId);
    setSelectedElId(null);
    setEditingElId(null);
    setRailSelectionActive(true);
  }, [startNodeId, slides]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  // Slide edits flow through here → historyReducer → slides state changes →
  // the write-back useEffect above syncs to onDeckChange (→ index.tsx → Firestore).
  const updateSlide = useCallback(
    (slideId: string, fn: (s: SlideNode) => SlideNode) =>
      dispatch({
        type: "commit",
        updater: (prev) => prev.map((s) => (s.id !== slideId ? s : fn(s))),
      }),
    []
  );

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  const dispatchOp = useCallback(
    (op: SlideEditOp) =>
      updateSlide(activeId, (s) => ({ ...s, root: applySlideEditOp(s.root!, op) })),
    [activeId, updateSlide]
  );

  const addLeaf = useCallback((leaf: LeafNode) => {
    const parentId = activeSlide.root!.id;
    const index = collectLeaves(activeSlide.root!).length;
    dispatchOp({ op: "addLeaf", parent: parentId, leaf, index });
    setSelectedElId(leaf.id);
    setEditingElId(null);
    setRailSelectionActive(false);
  }, [activeSlide, dispatchOp]);

  const deleteLeaf = useCallback(
    (id: string) => {
      dispatchOp({ op: "removeLeaf", nodeId: id });
      setSelectedElId(null);
      setEditingElId(null);
    },
    [dispatchOp]
  );

  const duplicateLeaf = useCallback(
    (id: string) => {
      const leaf = collectLeaves(activeSlide.root!).find((l) => l.id === id);
      if (!leaf) return;
      const copy: LeafNode = {
        ...leaf,
        id: makeLeafId(),
        placement: {
          ...leaf.placement,
          col: Math.min(GRID_COLS - leaf.placement.colSpan, leaf.placement.col + SNAP_STEP * 3),
          row: Math.min(GRID_ROWS - leaf.placement.rowSpan, leaf.placement.row + SNAP_STEP * 3),
        },
      };
      const parentId = activeSlide.root!.id;
      dispatchOp({ op: "addLeaf", parent: parentId, leaf: copy, index: collectLeaves(activeSlide.root!).length });
      setSelectedElId(copy.id);
      setRailSelectionActive(false);
    },
    [activeSlide, dispatchOp]
  );

  const addSlide = useCallback(() => {
    // Stable unique ID — the graph keys nodes on this; never reassign after creation.
    const id = makeSceneId();
    const newSlide: SlideNode = {
      id,
      index: slides.length + 1,
      title: "New Slide",
      x: 0, y: 0, rotation: 0,
      state: "rendered" as const,
      components: [],
      thumb: "title" as const,
      root: emptyRoot(id),
      candidates: [],
      activeDesignId: null,
      kind: "title" as const,
      status: "draft" as const,
    };
    // GRAPH SYNC: adding a slide = adding a node. The graph reads from the same slides
    // state and will display it as a new node without any extra wiring.
    dispatch({ type: "commit", updater: (prev) => [...prev, newSlide] });
    setActiveId(id);
    setSelectedElId(null);
    setEditingElId(null);
    setRailSelectionActive(true);
  }, [slides.length]);

  const deleteSlide = useCallback((id: string) => {
    if (slides.length <= 1) return; // never remove the last scene
    const idx = slides.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const sibling = slides[idx + 1] ?? slides[idx - 1];
    // Navigate before the state update so activeId is never left pointing at a removed scene
    setActiveId(sibling.id);
    setSelectedElId(null);
    setEditingElId(null);
    setRailSelectionActive(true);
    // GRAPH SYNC: deleting a slide = removing a node. Prune edges referencing this scene
    // now so the graph never encounters dangling connectors when it reads this state.
    dispatch({ type: "commit", updater: (prev) => reindexSlides(prev.filter((s) => s.id !== id)) });
    setLocalEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
  }, [slides]);

  const selectSlideFromRail = useCallback((id: string) => {
    setActiveId(id);
    setSelectedElId(null);
    setEditingElId(null);
    setRailSelectionActive(true);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); redo(); return;
      }
      if (isTextEditingTarget(e.target)) return;
      if (editingElId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && railSelectionActive && !selectedElId) {
        if (e.repeat) return;
        e.preventDefault();
        deleteSlide(activeId);
        return;
      }
      if (!selectedElId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteLeaf(selectedElId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateLeaf(selectedElId);
      }
      if (e.key === "Escape") { setEditingElId(null); setSelectedElId(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeId, selectedElId, editingElId, railSelectionActive, deleteSlide, deleteLeaf, duplicateLeaf, undo, redo]);

  // ── Paste image from clipboard ────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Let native text paste through when a text field has focus
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      let file: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
          file = items[i].getAsFile();
          break;
        }
      }
      if (!file) return;
      e.preventDefault();
      const src = URL.createObjectURL(file);
      if (selectedLeaf?.block.role === "image") {
        dispatchOp({ op: "setImageSrc", nodeId: selectedLeaf.id, src });
      } else {
        addLeaf(makeImageLeaf({ block: { role: "image", src }, placement: { col: 3000, row: 1688, colSpan: 4000, rowSpan: 2250 } }));
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [selectedLeaf, dispatchOp, addLeaf]);

  const commitMove   = (id: string, p: GridPlacement) => dispatchOp({ op: "setPlacement", nodeId: id, placement: p });
  const commitResize = (id: string, p: GridPlacement) => dispatchOp({ op: "setPlacement", nodeId: id, placement: p });
  const commitText   = (id: string, text: string) => {
    dispatchOp({ op: "setText", nodeId: id, text });
    setEditingElId(null);
  };

  const bringForward = useCallback((id: string) => {
    const leaves = collectLeaves(activeSlide.root!);
    const maxZ = leaves.reduce((m, l) => Math.max(m, l.zIndex ?? 0), 0);
    dispatchOp({ op: "setZIndex", nodeId: id, zIndex: maxZ + 1 });
  }, [activeSlide.root, dispatchOp]);

  const sendBack = useCallback((id: string) => {
    const leaves = collectLeaves(activeSlide.root!);
    const minZ = leaves.reduce((m, l) => Math.min(m, l.zIndex ?? 0), Infinity);
    dispatchOp({ op: "setZIndex", nodeId: id, zIndex: Math.max(0, minZ - 1) });
  }, [activeSlide.root, dispatchOp]);

  const applyCandidate = useCallback((candidateId: string) => {
    updateSlide(activeId, (s) => {
      const cand = (s.candidates ?? []).find((c) => c.id === candidateId);
      if (!cand) return s;
      return { ...s, root: deepCloneWithNewIds(cand.root), activeDesignId: candidateId };
    });
    setSelectedElId(null);
    setEditingElId(null);
  }, [activeId, updateSlide]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-chrome"
      onClick={() => { setSelectedElId(null); setEditingElId(null); }}
    >
      {/* ── Toolbar ── */}
      <div
        className="h-10 border-b border-border bg-chrome flex items-center px-3 gap-1 shrink-0 text-[12px]"
        onClick={(e) => e.stopPropagation()}
      >
        <ToolBtn title="Undo (Ctrl+Z)" dimmed={!canUndo} onClick={undo}><Undo2 size={13} /></ToolBtn>
        <ToolBtn title="Redo (Ctrl+Y)" dimmed={!canRedo} onClick={redo}><Redo2 size={13} /></ToolBtn>
        <Sep />
        <FontSizeControl
          value={textBlock?.style.fontSize}
          onChange={(size) =>
            selectedLeaf && dispatchOp({ op: "setStyle", nodeId: selectedLeaf.id, style: { fontSize: size } })
          }
        />
        <Sep />
        <WeightSelect
          value={textBlock?.style.fontWeight ?? 400}
          disabled={!textBlock}
          onChange={(w) => selectedLeaf && dispatchOp({ op: "setStyle", nodeId: selectedLeaf.id, style: { fontWeight: w } })}
        />
        <ToolBtn
          active={textBlock?.style.fontStyle === "italic"}
          onClick={() => selectedLeaf && dispatchOp({ op: "setStyle", nodeId: selectedLeaf.id, style: {
            fontStyle: textBlock?.style.fontStyle === "italic" ? "normal" : "italic",
          }})}
        ><Italic size={12} /></ToolBtn>
        <ToolBtn
          active={textBlock?.style.textDecoration === "underline"}
          onClick={() => selectedLeaf && dispatchOp({ op: "setStyle", nodeId: selectedLeaf.id, style: {
            textDecoration: textBlock?.style.textDecoration === "underline" ? "none" : "underline",
          }})}
        ><Underline size={12} /></ToolBtn>
        <Sep />
        {(["left", "center", "right"] as const).map((align, i) => (
          <ToolBtn
            key={align}
            active={textBlock?.style.textAlign === align}
            onClick={() => selectedLeaf && dispatchOp({ op: "setStyle", nodeId: selectedLeaf.id, style: { textAlign: align } })}
          >
            {[<AlignLeft size={12} />, <AlignCenter size={12} />, <AlignRight size={12} />][i]}
          </ToolBtn>
        ))}
        <Sep />
        {/* ── Per-element color & opacity ── */}
        <ColorSwatch
          color={textBlock?.style.color ?? shapeBlock?.style.fill}
          label={textBlock ? "Text color" : shapeBlock ? "Fill color" : "Color"}
          onChange={(hex) => {
            if (!selectedLeaf) return;
            if (textBlock)  dispatchOp({ op: "setStyle", nodeId: selectedLeaf.id, style: { color: hex } });
            if (shapeBlock) dispatchOp({ op: "setStyle", nodeId: selectedLeaf.id, style: { fill: hex } });
          }}
        />
        <OpacityInput
          value={selectedLeaf?.opacity}
          onChange={(o) => selectedLeaf && dispatchOp({ op: "setOpacity", nodeId: selectedLeaf.id, opacity: o })}
        />
        <Sep />
        <ToolBtn title="Add text"  onClick={() => addLeaf(makeTextLeaf())}><Type size={12} /></ToolBtn>
        <ToolBtn title="Add image" onClick={() => addLeaf(makeImageLeaf())}><ImageIcon size={12} /></ToolBtn>
        <ToolBtn title="Add shape" onClick={() => addLeaf(makeShapeLeaf())}><Square size={12} /></ToolBtn>
        <ToolBtn title="Layout"><LayoutTemplate size={12} /></ToolBtn>
        <Sep />
        {selectedLeaf && (
          <>
            <ToolBtn title="Duplicate (Ctrl+D)" onClick={() => duplicateLeaf(selectedLeaf.id)}><Copy size={12} /></ToolBtn>
            <ToolBtn title="Delete" onClick={() => deleteLeaf(selectedLeaf.id)}><Trash2 size={12} /></ToolBtn>
            <Sep />
          </>
        )}
        <div className="ml-auto">
          <button
            title={isGridVisible ? "Hide grid" : "Show grid"}
            onClick={toggleGrid}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              isGridVisible
                ? "bg-[color:var(--accent-teal)] text-white"
                : "text-muted-foreground hover:text-ink hover:bg-canvas/60"
            }`}
            aria-pressed={isGridVisible}
          >
            <Grid3x3 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Left slide rail ── */}
        <aside
          className="w-[180px] shrink-0 border-r border-border bg-chrome flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* GRAPH SYNC: slides = nodes; the graph keys on slide.id — IDs must be stable + unique.
               GRAPH SYNC: setActiveId = "focus this node"; graph will reflect the same selection.
               GRAPH SYNC: the linear order shown here is one path through the graph (the chosen path).
               Reordering here = choosing a different linearization, not restructuring the graph itself. */}
          <div className="flex-1 overflow-y-auto py-2">
            {slides.map((s) => {
              const isViewed = activeId === s.id;
              const isDeleteSelected = isViewed && railSelectionActive && !selectedElId && !editingElId;

              return (
                <div
                  key={s.id}
                  role="button"
                  aria-current={isViewed ? "true" : undefined}
                  aria-selected={isDeleteSelected}
                  tabIndex={0}
                  onClick={() => selectSlideFromRail(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectSlideFromRail(s.id);
                    }
                  }}
                  className={`group relative w-full px-3 py-1.5 flex gap-2.5 items-start text-left transition-all cursor-pointer ${
                    isDeleteSelected
                      ? "bg-canvas/80"
                      : isViewed
                      ? "bg-canvas/60"
                      : "hover:bg-canvas/50"
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono pt-1 w-4 shrink-0 text-right ${
                      isDeleteSelected ? "text-ink font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {s.index}
                  </span>
                  <div
                    className={`flex-1 rounded border overflow-hidden bg-white transition-all ${
                      isDeleteSelected
                        ? "border-ink shadow-[0_0_0_2px_oklch(0.54_0.105_192_/_0.35)]"
                        : isViewed
                        ? "border-[color:var(--accent-teal)]"
                        : "border-border"
                    }`}
                    style={{ aspectRatio: "16/9" }}
                  >
                    <SlideThumb node={s} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* GRAPH SYNC: scene edits (content/layout) mutate the shared slides state so both
               views always project the same source of truth — no separate copy per view. */}
          <div className="border-t border-border p-2.5 space-y-2">
            <button
              onClick={addSlide}
              className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-ink border border-dashed border-border rounded hover:border-[color:var(--accent-teal)] hover:bg-canvas/40 transition-all"
            >
              <Plus size={12} /> Add slide
            </button>
            <button
              onClick={() => deleteSlide(activeId)}
              disabled={slides.length <= 1 || !railSelectionActive || !!selectedElId || !!editingElId}
              className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-red-400 disabled:opacity-40 disabled:hover:text-muted-foreground border border-border rounded hover:bg-canvas/40 transition-all"
              title={
                slides.length <= 1
                  ? "Cannot delete the last slide"
                  : railSelectionActive && !selectedElId && !editingElId
                  ? "Delete selected slide"
                  : "Select a slide in the rail to delete it"
              }
            >
              <Trash2 size={12} /> Delete selected
            </button>
          </div>
        </aside>

        {/* ── Canvas ── */}
        <div
          className="flex-1 flex items-center justify-center bg-canvas/60 overflow-auto p-8 min-w-0"
          onClick={() => { setSelectedElId(null); setEditingElId(null); setRailSelectionActive(false); }}
          onWheel={(e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setZoom(zoomBy(zoom, e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
          }}
        >
          <div className="relative shrink-0" style={{ width: 928 * zoom, height: 522 * zoom }}>
            <div
              ref={slideRef}
              className="bg-white rounded-sm shadow-[0_8px_40px_-12px_oklch(0.3_0.01_175/0.3)] relative overflow-hidden"
              style={{
                width: 928,
                height: 522,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
              onClick={(e) => e.stopPropagation()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")) ?? null;
                if (!file) return;
                const src = URL.createObjectURL(file);
                if (selectedLeaf?.block.role === "image") {
                  dispatchOp({ op: "setImageSrc", nodeId: selectedLeaf.id, src });
                } else {
                  const colSpan = 4000;
                  const rowSpan = 2250;
                  const rect = slideRef.current!.getBoundingClientRect();
                  const col = snap(Math.max(0, Math.min(GRID_COLS - colSpan,
                    Math.round(((e.clientX - rect.left) / rect.width) * GRID_COLS - colSpan / 2))));
                  const row = snap(Math.max(0, Math.min(GRID_ROWS - rowSpan,
                    Math.round(((e.clientY - rect.top) / rect.height) * GRID_ROWS - rowSpan / 2))));
                  addLeaf(makeImageLeaf({ block: { role: "image", src }, placement: { col, row, colSpan, rowSpan } }));
                }
              }}
            >
              <GridOverlay visible={isGridVisible} />

              {[...collectLeaves(activeSlide.root!)]
                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                .map((leaf) => (
                  <CanvasElement
                    key={leaf.id}
                    leaf={leaf}
                    selected={selectedElId === leaf.id}
                    editing={editingElId === leaf.id}
                    slideRef={slideRef}
                    onSelect={() => {
                      setSelectedElId(leaf.id);
                      setRailSelectionActive(false);
                      if (selectedElId !== leaf.id) setEditingElId(null);
                    }}
                    onStartEdit={() => setEditingElId(leaf.id)}
                    onCommitText={(txt) => commitText(leaf.id, txt)}
                    onMove={(p) => commitMove(leaf.id, p)}
                    onResize={(p) => commitResize(leaf.id, p)}
                  />
                ))}

              {collectLeaves(activeSlide.root!).length === 0 && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
                  style={{ color: "oklch(0.7 0.01 192)" }}
                >
                  <Type size={32} strokeWidth={1} />
                  <span className="text-[13px] font-mono">Click T in the toolbar to add text</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <aside
          className="w-[280px] shrink-0 border-l border-border bg-chrome flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex border-b border-border shrink-0">
            {(
              [
                { id: "agent",   label: "Agent",   icon: Sparkles },
                { id: "design",  label: "Designs", icon: LayoutTemplate },
                { id: "arrange", label: "Arrange", icon: Layers },
              ] as { id: RightTab; label: string; icon: React.FC<{ size: number }> }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
                  rightTab === id
                    ? "text-ink border-b-2 border-[color:var(--accent-teal)] -mb-px"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                <Icon size={11} />{label}
              </button>
            ))}
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {rightTab === "agent"   && <AgentPanel />}
            {rightTab === "design"  && (
              <DesignsPanel
                slide={activeSlide}
                onApply={applyCandidate}
              />
            )}
            {rightTab === "arrange" && (
              <ArrangePanel
                leaf={selectedLeaf}
                onDispatchOp={dispatchOp}
                onBringForward={() => selectedLeaf && bringForward(selectedLeaf.id)}
                onSendBack={() => selectedLeaf && sendBack(selectedLeaf.id)}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── CanvasElement ────────────────────────────────────────────────────────────
const HANDLES: HandlePos[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_CURSOR: Record<HandlePos, string> = {
  n: "ns-resize", s: "ns-resize",
  e: "ew-resize", w: "ew-resize",
  ne: "nesw-resize", sw: "nesw-resize",
  nw: "nwse-resize", se: "nwse-resize",
};
const HANDLE_STYLE: Record<HandlePos, React.CSSProperties> = {
  n:  { top: -4, left: "50%", transform: "translateX(-50%)" },
  ne: { top: -4, right: -4 },
  e:  { top: "50%", right: -4, transform: "translateY(-50%)" },
  se: { bottom: -4, right: -4 },
  s:  { bottom: -4, left: "50%", transform: "translateX(-50%)" },
  sw: { bottom: -4, left: -4 },
  w:  { top: "50%", left: -4, transform: "translateY(-50%)" },
  nw: { top: -4, left: -4 },
};

interface CanvasElementProps {
  leaf: LeafNode;
  selected: boolean;
  editing: boolean;
  slideRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onStartEdit: () => void;
  onCommitText: (txt: string) => void;
  onMove: (p: GridPlacement) => void;
  onResize: (p: GridPlacement) => void;
}

function CanvasElement({
  leaf, selected, editing, slideRef,
  onSelect, onStartEdit, onCommitText, onMove, onResize,
}: CanvasElementProps) {
  // livePlacement drives visual re-render during drag
  const [livePlacement, setLivePlacement] = useState<GridPlacement | null>(null);
  // Ref gives the closure in onMouseUp always-current access (fixes stale-closure bug)
  const livePlacementRef = useRef<GridPlacement | null>(null);
  const drag = useRef<{
    type: "move" | HandlePos;
    startMx: number; startMy: number;
    startPlacement: GridPlacement;
    wasSelected: boolean; // captured at drag-start to avoid stale `selected` prop
  } | null>(null);

  const active = livePlacement ?? leaf.placement;
  const css = gridToCSS(active);

  const textBlock  = leaf.block.role === "text"  ? leaf.block : null;
  const shapeBlock = leaf.block.role === "shape" ? leaf.block : null;
  const imageBlock = leaf.block.role === "image" ? leaf.block : null;

  const startDrag = (type: "move" | HandlePos, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    drag.current = {
      type,
      startMx: e.clientX,
      startMy: e.clientY,
      startPlacement: leaf.placement,
      wasSelected: selected, // capture NOW before onSelect changes state
    };
    livePlacementRef.current = null;

    const onMouseMove = (ev: MouseEvent) => {
      if (!drag.current || !slideRef.current) return;
      const rect = slideRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - drag.current.startMx) / rect.width)  * GRID_COLS;
      const dy = ((ev.clientY - drag.current.startMy) / rect.height) * GRID_ROWS;
      const sp = drag.current.startPlacement;

      const p: GridPlacement =
        drag.current.type === "move"
          ? {
              col:     Math.max(0, Math.min(GRID_COLS - sp.colSpan, snap(sp.col + dx))),
              row:     Math.max(0, Math.min(GRID_ROWS - sp.rowSpan, snap(sp.row + dy))),
              colSpan: sp.colSpan,
              rowSpan: sp.rowSpan,
            }
          : applyResize(drag.current.type as HandlePos, sp, dx, dy);

      livePlacementRef.current = p; // always current — safe for closure
      setLivePlacement(p);          // triggers re-render for visual feedback
    };

    const onMouseUp = () => {
      const final = livePlacementRef.current; // read ref, not stale state
      const didMove = final !== null;

      if (!didMove && drag.current?.type === "move") {
        // It was a click (no drag). Enter edit mode only if element was already selected.
        if (drag.current.wasSelected) onStartEdit();
      } else if (didMove && final) {
        drag.current?.type === "move" ? onMove(final) : onResize(final);
      }

      drag.current = null;
      livePlacementRef.current = null;
      setLivePlacement(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const fontFamilyCSS =
    textBlock?.style.fontFamily === "mono"  ? "var(--font-mono, monospace)"  :
    textBlock?.style.fontFamily === "serif" ? "var(--font-serif, serif)"     :
    "inherit";

  const textStyle: React.CSSProperties = textBlock ? {
    width: "100%", height: "100%", padding: "4px",
    fontSize:       textBlock.style.fontSize,
    fontWeight:     textBlock.style.fontWeight,
    fontStyle:      textBlock.style.fontStyle,
    color:          textBlock.style.color,
    textAlign:      textBlock.style.textAlign,
    textDecoration: textBlock.style.textDecoration,
    lineHeight:     textBlock.style.lineHeight ?? 1.4,
    letterSpacing:  textBlock.style.letterSpacing,
    fontFamily: fontFamilyCSS,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  } : {};

  return (
    <div
      style={{
        ...css,
        opacity: leaf.opacity ?? 1,
        transform: (leaf.rotation ?? 0) ? `rotate(${leaf.rotation}deg)` : undefined,
        cursor: editing ? "text" : "move",
        zIndex: (leaf.zIndex ?? 1) + 5,
        userSelect: editing ? "text" : "none",
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => {
        onSelect();
        if (!editing) startDrag("move", e);
      }}
    >
      {/* ── Text ── */}
      {textBlock && (
        editing ? (
          <textarea
            autoFocus
            defaultValue={textBlock.text}
            // BUG FIX: stopPropagation on mousedown so outer div doesn't call onSelect()
            // which would clear editingElId and exit edit mode mid-type
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={(e) => onCommitText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCommitText((e.target as HTMLTextAreaElement).value);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...textStyle,
              resize: "none",
              background: "transparent",
              border: "none",
              outline: "none",
              cursor: "text",
            }}
          />
        ) : (
          <div style={textStyle}>{textBlock.text}</div>
        )
      )}

      {/* ── Shape ── */}
      {shapeBlock && (
        <div
          style={{
            width: "100%", height: "100%",
            background: shapeBlock.style.fill,
            borderRadius: shapeBlock.style.borderRadius,
            border: (shapeBlock.style.strokeWidth ?? 0) > 0
              ? `${shapeBlock.style.strokeWidth}px solid ${shapeBlock.style.stroke}`
              : undefined,
          }}
        />
      )}

      {/* ── Image ── */}
      {imageBlock && (
        imageBlock.src ? (
          <img src={imageBlock.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              background: "oklch(0.94 0.015 192 / 0.3)",
              border: "2px dashed oklch(0.54 0.105 192 / 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 6,
              color: "oklch(0.54 0.105 192)",
            }}
          >
            <ImageIcon size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 11, opacity: 0.7 }}>Drop image here</span>
          </div>
        )
      )}

      {/* ── Selection box + resize handles ── */}
      {selected && !editing && (
        <div
          style={{
            position: "absolute", inset: -2,
            border: "2px solid oklch(0.54 0.105 192)",
            borderRadius: 1, pointerEvents: "none", zIndex: 1,
          }}
        >
          {HANDLES.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                width: 8, height: 8,
                background: "white",
                border: "1.5px solid oklch(0.54 0.105 192)",
                borderRadius: 1.5,
                cursor: HANDLE_CURSOR[h],
                pointerEvents: "all",
                ...HANDLE_STYLE[h],
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag(h, e);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function applyResize(handle: HandlePos, sp: GridPlacement, dx: number, dy: number): GridPlacement {
  let { col, row, colSpan, rowSpan } = sp;
  const min = SNAP_STEP;

  if (handle.includes("e")) colSpan = Math.max(min, snap(sp.colSpan + dx));
  if (handle.includes("w")) {
    const newCol = snap(Math.max(0, sp.col + dx));
    const delta = newCol - sp.col;
    colSpan = Math.max(min, sp.colSpan - delta);
    col = sp.col + (sp.colSpan - colSpan);
  }
  if (handle.includes("s")) rowSpan = Math.max(min, snap(sp.rowSpan + dy));
  if (handle.includes("n")) {
    const newRow = snap(Math.max(0, sp.row + dy));
    const delta = newRow - sp.row;
    rowSpan = Math.max(min, sp.rowSpan - delta);
    row = sp.row + (sp.rowSpan - rowSpan);
  }

  return {
    col:     Math.max(0, Math.min(GRID_COLS - colSpan, col)),
    row:     Math.max(0, Math.min(GRID_ROWS - rowSpan, row)),
    colSpan: Math.min(colSpan, GRID_COLS - col),
    rowSpan: Math.min(rowSpan, GRID_ROWS - row),
  };
}

// ─── Agent panel ──────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
}

function AgentPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages grow
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: `msg-${Date.now()}`, role: "user", content: text }]);
    setDraft("");

    // ── AGENT ROLE ────────────────────────────────────────────────────────────
    // This agent proposes slide edits (IR mutations), not just chat replies.
    // It reads the current slides IR + the user's message and returns structured
    // proposals — add/remove/restructure scenes, swap layouts, edit content,
    // place images. Proposals surface here for user review; they are NEVER
    // auto-applied. The user explicitly accepts or discards each one.
    // This mirrors the ghost-node accept/discard pattern used on the board.
    //
    // ── PROPOSAL FLOW ─────────────────────────────────────────────────────────
    // 1. INTAKE: call Gemini Flash with (text, slides) → returns ProposedMutations[].
    //    Append an agent message carrying the proposal object (not just a string).
    //    The PROPOSAL RENDER POINT above surfaces Accept / Discard affordances.
    //    On Accept  → dispatch({ type: "commit", updater: applyMutations(proposal) })
    //    On Discard → mark proposal dropped; bubble stays as plain chat message.
    //
    // 2. SELF-CRITIQUE: after the render loop applies mutations, diff expected vs.
    //    rendered output. Failures / imbalance → agent messages with scene refs.
    //
    // 3. ARGUMENT INTELLIGENCE: Gemini Pro scans argument quality across all scenes.
    //    Unsupported claims / pacing issues → agent messages linking to the scene
    //    and the Argument tab.
    //
    // 4. AGENT RESPONSE: to append any agent message (chat reply or proposal):
    //    setMessages((prev) => [...prev, { id: `msg-${Date.now()}`, role: "agent", content }]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
            <div className="w-9 h-9 rounded-full bg-canvas border border-border flex items-center justify-center">
              <Sparkles size={15} style={{ color: "var(--accent-teal)" }} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[190px]">
              Drop a brain-dump, dataset, or prompt and the agent will refine the deck from here.
            </p>
          </div>
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              // User message — right-aligned teal bubble, no avatar
              <div key={msg.id} className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-[11px] leading-snug text-white whitespace-pre-wrap"
                  style={{ background: "var(--accent-teal)" }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              // Agent message — left-aligned muted bubble, no avatar.
              // PROPOSAL RENDER POINT: when the agent proposes slide edits, this bubble
              // will carry a pending proposal (structured IR mutations) instead of plain text.
              // Render as: message content + Accept / Discard action row beneath the bubble.
              // Accepted → dispatch({ type: "commit", updater: applyMutations })
              // Discarded → drop the proposal, bubble stays as a plain chat message.
              <div key={msg.id} className="flex">
                <div className="max-w-[85%] bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2.5 shrink-0">
        <div className="border border-border rounded-lg px-3 py-2 bg-card flex items-center">
          <input
            className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Ask the agent to refine the deck…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 px-0.5">
          <div className="flex gap-0.5">
            {[Paperclip, Mic].map((Icon, i) => (
              <button key={i} className="w-7 h-7 flex items-center justify-center rounded hover:bg-canvas/60 text-muted-foreground hover:text-ink transition-colors">
                <Icon size={13} />
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity"
            style={{ background: "var(--accent-teal)" }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Designs panel ────────────────────────────────────────────────────────────
function DesignsPanel({
  slide,
  onApply,
}: {
  slide: import("@/lib/projektor-data").SlideNode;
  onApply: (candidateId: string) => void;
}) {
  if ((slide.candidates ?? []).length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-5 text-center">
        <LayoutTemplate size={22} className="text-muted-foreground" strokeWidth={1.5} />
        <p className="text-[11px] text-muted-foreground leading-snug">
          No design candidates yet.
          <br />The agent will generate alternatives here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
      {(slide.candidates ?? []).map((cand) => {
        const isActive = slide.activeDesignId === cand.id;
        return (
          <button
            key={cand.id}
            onClick={() => onApply(cand.id)}
            className={`w-full text-left rounded-md border-2 overflow-hidden transition-all ${
              isActive
                ? "border-[color:var(--accent-teal)] shadow-sm"
                : "border-border hover:border-[color:var(--accent-teal)]/50"
            }`}
          >
            {/* Mini slide preview — reuses SlideThumb with candidate's root */}
            <div className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: "16/9" }}>
              <SlideThumb node={{ ...slide, root: cand.root }} />
            </div>
            <div
              className={`flex items-center justify-between px-2 py-1.5 text-[10px] font-medium ${
                isActive ? "bg-[color:var(--accent-soft)]" : "bg-chrome"
              }`}
            >
              <span className={isActive ? "font-semibold text-ink" : "text-muted-foreground"}>
                {cand.label}
              </span>
              {isActive && (
                <span className="text-[9px] font-mono uppercase tracking-wide" style={{ color: "var(--accent-teal)" }}>
                  Active
                </span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-[10px] text-center text-muted-foreground pt-1 pb-2">
        AI-generated candidates will appear here
      </p>
    </div>
  );
}

// ─── Arrange panel ────────────────────────────────────────────────────────────
interface ArrangePanelProps {
  leaf: LeafNode | null;
  onDispatchOp: (op: SlideEditOp) => void;
  onBringForward: () => void;
  onSendBack: () => void;
}

function ArrangePanel({ leaf, onDispatchOp, onBringForward, onSendBack }: ArrangePanelProps) {
  const p = leaf?.placement;

  const pctLabel = (v: number, max: number) => `${((v / max) * 100).toFixed(1)}%`;
  const setPlacement = (key: keyof GridPlacement, raw: string) => {
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || !leaf) return;
    onDispatchOp({ op: "setPlacement", nodeId: leaf.id, placement: { ...leaf.placement, [key]: snap(num) } });
  };

  const shapeBlock = leaf?.block.role === "shape" ? leaf.block : null;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      {!leaf && <div className="text-center text-muted-foreground py-8 text-[11px]">Select an element to arrange</div>}

      {leaf && p && (
        <>
          <Section label="Position">
            <div className="grid grid-cols-2 gap-2">
              {([["X", "col", p.col, GRID_COLS], ["Y", "row", p.row, GRID_ROWS]] as const).map(([label, key, val, max]) => (
                <div key={label}>
                  <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">
                    {label} <span className="opacity-50">({pctLabel(val, max)})</span>
                  </div>
                  <input
                    key={val}
                    defaultValue={val}
                    onBlur={(e) => setPlacement(key as keyof GridPlacement, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setPlacement(key as keyof GridPlacement, (e.target as HTMLInputElement).value)}
                    className="w-full px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section label="Size">
            <div className="grid grid-cols-2 gap-2">
              {([["W", "colSpan", p.colSpan, GRID_COLS], ["H", "rowSpan", p.rowSpan, GRID_ROWS]] as const).map(([label, key, val, max]) => (
                <div key={label}>
                  <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">
                    {label} <span className="opacity-50">({pctLabel(val, max)})</span>
                  </div>
                  <input
                    key={val}
                    defaultValue={val}
                    onBlur={(e) => setPlacement(key as keyof GridPlacement, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setPlacement(key as keyof GridPlacement, (e.target as HTMLInputElement).value)}
                    className="w-full px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section label="Rotation">
            <Row label="Angle">
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={-180} max={180} value={leaf.rotation ?? 0}
                  onChange={(e) => onDispatchOp({ op: "setRotation", nodeId: leaf.id, rotation: Number(e.target.value) })}
                  className="w-16 px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]"
                />
                <span className="text-muted-foreground">°</span>
              </div>
            </Row>
          </Section>

          <Section label="Layer">
            <Row label="Z-index"><span className="font-mono text-[10px]">{leaf.zIndex ?? 0}</span></Row>
            <div className="flex gap-1.5 mt-1">
              <button onClick={onBringForward} className="flex-1 py-1.5 text-[10px] font-medium border border-border rounded hover:bg-canvas/50 transition-colors">Bring to Front</button>
              <button onClick={onSendBack}     className="flex-1 py-1.5 text-[10px] font-medium border border-border rounded hover:bg-canvas/50 transition-colors">Send to Back</button>
            </div>
          </Section>

          {shapeBlock && (
            <Section label="Shape">
              <Row label="Radius">
                <div className="flex items-center gap-1.5">
                  <input
                    type="range" min={0} max={100} value={shapeBlock.style.borderRadius}
                    onChange={(e) => onDispatchOp({ op: "setStyle", nodeId: leaf.id, style: { borderRadius: Number(e.target.value) } })}
                    className="w-20 accent-[color:var(--accent-teal)]"
                  />
                  <span className="font-mono text-[10px] w-6">{shapeBlock.style.borderRadius}</span>
                </div>
              </Row>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────
function ToolBtn({ children, title, active, dimmed, onClick }: {
  children: React.ReactNode;
  title?: string;
  active?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={dimmed}
      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
        active ? "bg-canvas text-ink" : "text-muted-foreground hover:text-ink hover:bg-canvas/60"
      } ${dimmed ? "opacity-30 cursor-default" : ""}`}
    >
      {children}
    </button>
  );
}
function Sep() { return <div className="w-px h-5 bg-border mx-1 shrink-0" />; }

function WeightSelect({ value, disabled, onChange }: {
  value: number; disabled?: boolean; onChange: (w: number) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      className={`h-7 px-1 text-[10px] border border-border rounded bg-card text-ink outline-none cursor-pointer transition-opacity ${
        disabled ? "opacity-30 cursor-default" : "focus:border-[color:var(--accent-teal)]"
      }`}
      style={{ minWidth: 68 }}
    >
      {WEIGHT_OPTIONS.map((w) => (
        <option key={w.value} value={w.value}>{w.label}</option>
      ))}
    </select>
  );
}

function ColorSwatch({ color, label, onChange }: {
  color: string | undefined; label?: string; onChange: (hex: string) => void;
}) {
  const disabled = color === undefined;
  return (
    <label
      title={label ?? "Color"}
      className={`relative w-7 h-7 rounded border border-border flex items-center justify-center cursor-pointer shrink-0 transition-opacity ${
        disabled ? "opacity-30 pointer-events-none" : "hover:border-[color:var(--accent-teal)]"
      }`}
    >
      {/* Visible swatch — CSS renders the real color (oklch, hsl, hex all work) */}
      <div className="w-4 h-4 rounded-sm shadow-sm" style={{ background: color ?? "#ccc" }} />
      {/* Hidden native picker — value needs hex; picker updates to hex on pick */}
      <input
        type="color"
        value={toHex(color)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </label>
  );
}

function OpacityInput({ value, onChange }: {
  value: number | undefined; onChange: (o: number) => void;
}) {
  const pct = value !== undefined ? Math.round(value * 100) : undefined;
  const [draft, setDraft] = useState(pct?.toString() ?? "");
  useEffect(() => { setDraft(pct?.toString() ?? ""); }, [pct]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 100) onChange(n / 100);
    else setDraft(pct?.toString() ?? "");
  };

  return (
    <div
      className={`flex items-center border border-border rounded h-7 overflow-hidden transition-opacity ${
        value === undefined ? "opacity-30" : ""
      }`}
    >
      <input
        type="text"
        value={draft}
        disabled={value === undefined}
        placeholder="—"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setDraft(pct?.toString() ?? ""); (e.target as HTMLInputElement).blur(); }
        }}
        className="w-7 px-1 text-[11px] font-mono text-center bg-transparent outline-none text-ink placeholder:text-muted-foreground"
      />
      <span className="pr-1 text-[10px] text-muted-foreground font-mono">%</span>
    </div>
  );
}
const FONT_SIZE_PRESETS = [8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 72, 96];

function FontSizeControl({ value, onChange }: { value: number | undefined; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep draft in sync when selection changes
  useEffect(() => { setDraft(value?.toString() ?? ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 400) onChange(n);
    else setDraft(value?.toString() ?? "");
  };

  const disabled = value === undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center border rounded h-7 overflow-visible ${disabled ? "border-border opacity-40" : "border-border"}`}>
        <input
          type="text"
          value={draft}
          placeholder="—"
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={(e) => { commit(e.target.value); setOpen(false); }}
          onKeyDown={(e) => {
            e.stopPropagation(); // prevent Delete from removing the element
            if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Escape") { setDraft(value?.toString() ?? ""); setOpen(false); (e.target as HTMLInputElement).blur(); }
          }}
          className="w-9 px-1 text-[11px] font-mono text-center bg-transparent outline-none text-ink placeholder:text-muted-foreground"
        />
        <button
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); if (!disabled) setOpen((v) => !v); }}
          className="px-1 h-full border-l border-border flex items-center text-muted-foreground hover:text-ink hover:bg-canvas/40 transition-colors"
        >
          <ChevronDown size={10} />
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded shadow-lg z-[100] py-1 w-16 max-h-56 overflow-y-auto">
          {FONT_SIZE_PRESETS.map((size) => (
            <button
              key={size}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(size);
                setDraft(size.toString());
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-0.5 text-[11px] font-mono hover:bg-canvas/60 transition-colors ${
                value === size ? "font-bold" : "text-ink"
              }`}
              style={value === size ? { color: "var(--accent-teal)" } : undefined}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
