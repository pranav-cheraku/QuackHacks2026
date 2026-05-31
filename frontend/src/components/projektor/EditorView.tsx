import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import type React from "react";
import {
  Undo2, Redo2, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Type, ImageIcon, Square, ChevronDown,
  Plus, Sparkles, CheckCircle2, Loader2,
  Paperclip, Mic, Send, LayoutTemplate,
  Layers, SlidersHorizontal, Grid3x3, Trash2, Copy,
} from "lucide-react";
import { INITIAL_NODES } from "@/lib/projektor-data";
import type { SlideNode } from "@/lib/projektor-data";
import { SlideThumb } from "./SlideThumb";
import { GridOverlay } from "./GridOverlay";
import { makeTextElement, makeShapeElement, makeImageElement, nextId } from "@/lib/slide-model";
import type { SlideElement, TextStyle } from "@/lib/slide-model";
import { gridToCSS, GRID_COLS, GRID_ROWS, snap, SNAP_STEP } from "@/lib/grid";
import type { GridPlacement } from "@/lib/grid";
import { SLIDE_ELEMENTS } from "@/lib/initial-slides";

// ─── Undo/redo history ────────────────────────────────────────────────────────
type History = { past: SlideNode[][]; present: SlideNode[]; future: SlideNode[][] };
type HistoryAction =
  | { type: "commit"; updater: (s: SlideNode[]) => SlideNode[] }
  | { type: "undo" }
  | { type: "redo" };

function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
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

interface Props { startNodeId: string | null; }
type RightTab = "agent" | "design" | "arrange";
type HandlePos = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

// ─── EditorView ───────────────────────────────────────────────────────────────
export function EditorView({ startNodeId }: Props) {
  const [{ past, present: slides, future }, dispatch] = useReducer(
    historyReducer,
    null,
    (): History => ({
      past: [],
      present: INITIAL_NODES.map((n) => ({ ...n, elements: SLIDE_ELEMENTS[n.id] ?? [] })),
      future: [],
    })
  );
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const [activeId, setActiveId] = useState(startNodeId ?? "n1");
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [editingElId, setEditingElId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("agent");
  const [showGrid, setShowGrid] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const activeSlide = slides.find((s) => s.id === activeId) ?? slides[0];
  const selectedEl = activeSlide?.elements.find((e) => e.id === selectedElId) ?? null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const updateSlide = useCallback(
    (slideId: string, fn: (s: SlideNode) => SlideNode) =>
      dispatch({ type: "commit", updater: (prev) => prev.map((s) => (s.id === slideId ? fn(s) : s)) }),
    []
  );

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  const updateEl = useCallback(
    (elId: string, fn: (e: SlideElement) => SlideElement) =>
      updateSlide(activeId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === elId ? fn(e) : e)),
      })),
    [activeId, updateSlide]
  );

  const addEl = (el: SlideElement) => {
    updateSlide(activeId, (s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedElId(el.id);
    setEditingElId(null);
  };

  const deleteEl = useCallback(
    (id: string) => {
      updateSlide(activeId, (s) => ({
        ...s,
        elements: s.elements.filter((e) => e.id !== id),
      }));
      setSelectedElId(null);
      setEditingElId(null);
    },
    [activeId, updateSlide]
  );

  const duplicateEl = useCallback(
    (id: string) => {
      const el = activeSlide.elements.find((e) => e.id === id);
      if (!el) return;
      const copy: SlideElement = {
        ...el,
        id: nextId(),
        placement: {
          ...el.placement,
          col: Math.min(GRID_COLS - el.placement.colSpan, el.placement.col + SNAP_STEP * 3),
          row: Math.min(GRID_ROWS - el.placement.rowSpan, el.placement.row + SNAP_STEP * 3),
        },
      };
      updateSlide(activeId, (s) => ({ ...s, elements: [...s.elements, copy] }));
      setSelectedElId(copy.id);
    },
    [activeId, activeSlide, updateSlide]
  );

  const addSlide = () => {
    const newSlide: SlideNode = {
      id: `n-${Date.now()}`,
      index: slides.length + 1,
      title: "New Slide",
      x: 0, y: 0, rotation: 0,
      state: "rendered",
      components: [],
      thumb: "title",
      elements: [],
    };
    dispatch({ type: "commit", updater: (prev) => [...prev, newSlide] });
    setActiveId(newSlide.id);
    setSelectedElId(null);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); redo(); return;
      }
      if (editingElId) return;
      if (!selectedElId) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") deleteEl(selectedElId);
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateEl(selectedElId);
      }
      if (e.key === "Escape") { setEditingElId(null); setSelectedElId(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedElId, editingElId, deleteEl, duplicateEl, undo, redo]);

  const commitMove   = (id: string, p: GridPlacement) => updateEl(id, (e) => ({ ...e, placement: p }));
  const commitResize = (id: string, p: GridPlacement) => updateEl(id, (e) => ({ ...e, placement: p }));
  const commitText   = (id: string, content: string) => {
    updateEl(id, (e) => ({ ...e, text: { ...e.text!, content } }));
    setEditingElId(null);
  };
  const bringForward = (id: string) => updateEl(id, (e) => ({ ...e, zIndex: e.zIndex + 1 }));
  const sendBack     = (id: string) => updateEl(id, (e) => ({ ...e, zIndex: Math.max(0, e.zIndex - 1) }));

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
        <Select label={selectedEl?.text ? `${selectedEl.text.fontSize}px` : "Size"} />
        <Sep />
        <ToolBtn
          active={selectedEl?.text?.fontWeight === 700}
          onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({
            ...e, text: { ...e.text!, fontWeight: e.text!.fontWeight >= 700 ? 400 : 700 },
          }))}
        ><Bold size={12} /></ToolBtn>
        <ToolBtn
          active={selectedEl?.text?.fontStyle === "italic"}
          onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({
            ...e, text: { ...e.text!, fontStyle: e.text!.fontStyle === "italic" ? "normal" : "italic" },
          }))}
        ><Italic size={12} /></ToolBtn>
        <ToolBtn
          active={selectedEl?.text?.textDecoration === "underline"}
          onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({
            ...e, text: { ...e.text!, textDecoration: e.text!.textDecoration === "underline" ? "none" : "underline" },
          }))}
        ><Underline size={12} /></ToolBtn>
        <Sep />
        {(["left", "center", "right"] as const).map((align, i) => (
          <ToolBtn
            key={align}
            active={selectedEl?.text?.textAlign === align}
            onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({
              ...e, text: { ...e.text!, textAlign: align },
            }))}
          >
            {[<AlignLeft size={12} />, <AlignCenter size={12} />, <AlignRight size={12} />][i]}
          </ToolBtn>
        ))}
        <Sep />
        <ToolBtn title="Add text"  onClick={() => addEl(makeTextElement())}><Type size={12} /></ToolBtn>
        <ToolBtn title="Add image" onClick={() => addEl(makeImageElement())}><ImageIcon size={12} /></ToolBtn>
        <ToolBtn title="Add shape" onClick={() => addEl(makeShapeElement())}><Square size={12} /></ToolBtn>
        <ToolBtn title="Layout"><LayoutTemplate size={12} /></ToolBtn>
        <Sep />
        {selectedEl && (
          <>
            <ToolBtn title="Duplicate (Ctrl+D)" onClick={() => duplicateEl(selectedEl.id)}><Copy size={12} /></ToolBtn>
            <ToolBtn title="Delete" onClick={() => deleteEl(selectedEl.id)}><Trash2 size={12} /></ToolBtn>
            <Sep />
          </>
        )}
        <div className="ml-auto">
          <button
            title={showGrid ? "Hide grid" : "Show grid"}
            onClick={() => setShowGrid((v) => !v)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${showGrid ? "text-white" : "text-muted-foreground hover:text-ink"}`}
            style={showGrid ? { background: "var(--accent-teal)" } : undefined}
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
          <div className="flex-1 overflow-y-auto py-2">
            {slides.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveId(s.id); setSelectedElId(null); setEditingElId(null); }}
                className={`w-full px-3 py-1.5 flex gap-2.5 items-start text-left transition-all ${
                  activeId === s.id ? "bg-[color:var(--accent-soft)]" : "hover:bg-canvas/50"
                }`}
              >
                <span className="text-[10px] font-mono text-muted-foreground pt-1 w-4 shrink-0 text-right">{s.index}</span>
                <div
                  className={`flex-1 rounded border overflow-hidden bg-white transition-all ${
                    activeId === s.id
                      ? "border-[color:var(--accent-teal)] shadow-[0_0_0_2px_var(--accent-soft)]"
                      : "border-border"
                  }`}
                  style={{ aspectRatio: "16/9" }}
                >
                  <SlideThumb node={s} />
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border p-2.5">
            <button
              onClick={addSlide}
              className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-ink border border-dashed border-border rounded hover:border-[color:var(--accent-teal)] hover:bg-canvas/40 transition-all"
            >
              <Plus size={12} /> Add slide
            </button>
          </div>
        </aside>

        {/* ── Canvas ── */}
        <div
          className="flex-1 flex items-center justify-center bg-canvas/60 overflow-auto p-8 min-w-0"
          onClick={() => { setSelectedElId(null); setEditingElId(null); }}
        >
          <div
            ref={slideRef}
            className="bg-white rounded-sm shadow-[0_8px_40px_-12px_oklch(0.3_0.01_175/0.3)] relative overflow-hidden shrink-0"
            style={{ width: 928, height: 522 }}
            onClick={(e) => e.stopPropagation()}
          >
            <GridOverlay visible={showGrid} />

            {/* All content comes from the element model */}
            {[...activeSlide.elements]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => (
                <CanvasElement
                  key={el.id}
                  el={el}
                  selected={selectedElId === el.id}
                  editing={editingElId === el.id}
                  slideRef={slideRef}
                  onSelect={() => {
                    setSelectedElId(el.id);
                    // Only clear editing if switching to a different element
                    if (selectedElId !== el.id) setEditingElId(null);
                  }}
                  onStartEdit={() => setEditingElId(el.id)}
                  onCommitText={(txt) => commitText(el.id, txt)}
                  onMove={(p) => commitMove(el.id, p)}
                  onResize={(p) => commitResize(el.id, p)}
                />
              ))}

            {/* Empty-slide hint */}
            {activeSlide.elements.length === 0 && (
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

        {/* ── Right panel ── */}
        <aside
          className="w-[280px] shrink-0 border-l border-border bg-chrome flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex border-b border-border shrink-0">
            {(
              [
                { id: "agent",   label: "Agent",   icon: Sparkles },
                { id: "design",  label: "Design",  icon: SlidersHorizontal },
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
              <DesignPanel
                el={selectedEl}
                onChange={(fn) => selectedEl && updateEl(selectedEl.id, fn)}
              />
            )}
            {rightTab === "arrange" && (
              <ArrangePanel
                el={selectedEl}
                onChange={(fn) => selectedEl && updateEl(selectedEl.id, fn)}
                onBringForward={() => selectedEl && bringForward(selectedEl.id)}
                onSendBack={() => selectedEl && sendBack(selectedEl.id)}
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
  el: SlideElement;
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
  el, selected, editing, slideRef,
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

  const active = livePlacement ?? el.placement;
  const css = gridToCSS(active);

  const startDrag = (type: "move" | HandlePos, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    drag.current = {
      type,
      startMx: e.clientX,
      startMy: e.clientY,
      startPlacement: el.placement,
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
    el.text?.fontFamily === "mono"   ? "var(--font-mono, monospace)"  :
    el.text?.fontFamily === "serif"  ? "var(--font-serif, serif)"     :
    "inherit";

  const textStyle: React.CSSProperties = el.text ? {
    width: "100%", height: "100%", padding: "4px",
    fontSize: el.text.fontSize,
    fontWeight: el.text.fontWeight,
    fontStyle: el.text.fontStyle,
    color: el.text.color,
    textAlign: el.text.textAlign,
    textDecoration: el.text.textDecoration,
    lineHeight: el.text.lineHeight ?? 1.4,
    letterSpacing: el.text.letterSpacing,
    fontFamily: fontFamilyCSS,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  } : {};

  return (
    <div
      style={{
        ...css,
        opacity: el.opacity,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        cursor: editing ? "text" : "move",
        zIndex: el.zIndex + 5,
        userSelect: editing ? "text" : "none",
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => {
        onSelect();
        if (!editing) startDrag("move", e);
      }}
    >
      {/* ── Text ── */}
      {el.type === "text" && (
        editing ? (
          <textarea
            autoFocus
            defaultValue={el.text?.content}
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
          <div style={textStyle}>{el.text?.content}</div>
        )
      )}

      {/* ── Shape ── */}
      {el.type === "shape" && (
        <div
          style={{
            width: "100%", height: "100%",
            background: el.shape?.fill,
            borderRadius: el.shape?.borderRadius,
            border: (el.shape?.strokeWidth ?? 0) > 0
              ? `${el.shape!.strokeWidth}px solid ${el.shape!.stroke}`
              : undefined,
          }}
        />
      )}

      {/* ── Image ── */}
      {el.type === "image" && (
        el.src ? (
          <img src={el.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
function AgentPanel() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex justify-end gap-2 items-start">
          <div className="max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-[11px] leading-snug text-white" style={{ background: "var(--accent-teal)" }}>
            Here's the brain-dump + our deck-data.csv. Make it investor-ready, 5 minutes.
          </div>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5" style={{ background: "oklch(0.55 0.1 250)" }}>You</div>
        </div>
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full bg-canvas border border-border flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={10} style={{ color: "var(--accent-teal)" }} />
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[11px] space-y-2">
            {[
              { done: true,  text: "Brand extracted → persimmon + pine palette" },
              { done: true,  text: "7 scenes laid out, 6 passed first render" },
              { done: true,  text: "Scene 04 re-balanced (was crowded)" },
              { done: false, text: "Checking the argument…" },
            ].map(({ done, text }, i) => (
              <div key={i} className="flex items-start gap-2">
                {done
                  ? <CheckCircle2 size={12} className="mt-px shrink-0" style={{ color: "var(--accent-teal)" }} />
                  : <Loader2     size={12} className="mt-px shrink-0 animate-spin text-muted-foreground" />}
                <span className={done ? "text-ink" : "text-muted-foreground"}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full bg-canvas border border-border flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={10} style={{ color: "var(--accent-teal)" }} />
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
            Scene <strong className="text-ink">06</strong> makes a claim with no evidence, and you're running <strong className="text-ink">~7 min</strong> for a 5-min slot.
          </div>
        </div>
      </div>
      <div className="border-t border-border p-2.5 shrink-0">
        <div className="border border-border rounded-lg px-3 py-2 bg-card flex items-center">
          <input className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Ask the agent to refine the deck…" />
        </div>
        <div className="flex items-center justify-between mt-2 px-0.5">
          <div className="flex gap-0.5">
            {[Paperclip, Mic].map((Icon, i) => (
              <button key={i} className="w-7 h-7 flex items-center justify-center rounded hover:bg-canvas/60 text-muted-foreground hover:text-ink transition-colors"><Icon size={13} /></button>
            ))}
          </div>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity" style={{ background: "var(--accent-teal)" }}>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Design panel ─────────────────────────────────────────────────────────────
interface DesignPanelProps {
  el: SlideElement | null;
  onChange: (fn: (e: SlideElement) => SlideElement) => void;
}

const WEIGHTS = [
  { label: "Regular",   value: 400 },
  { label: "Medium",    value: 500 },
  { label: "SemiBold",  value: 600 },
  { label: "Bold",      value: 700 },
  { label: "ExtraBold", value: 800 },
];

function DesignPanel({ el, onChange }: DesignPanelProps) {
  const t  = el?.text;
  const sh = el?.shape;

  const setT = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) =>
    onChange((e) => ({ ...e, text: { ...e.text!, [key]: value } }));

  // Convert any color to hex for the color input (falls back gracefully)
  const toHex = (c?: string) => {
    if (!c) return "#000000";
    if (c.startsWith("#")) return c;
    return "#000000";
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      {!el && <div className="text-center text-muted-foreground py-8 text-[11px]">Select an element to edit its style</div>}

      {el && t && (
        <Section label="Typography">
          <Row label="Size">
            <div className="flex items-center border border-border rounded h-6">
              <button className="px-1.5 text-muted-foreground hover:text-ink" onClick={() => setT("fontSize", Math.max(8, t.fontSize - 2))}>−</button>
              <span className="px-2 font-mono text-[10px] border-x border-border w-10 text-center">{t.fontSize}</span>
              <button className="px-1.5 text-muted-foreground hover:text-ink" onClick={() => setT("fontSize", t.fontSize + 2)}>+</button>
            </div>
          </Row>
          <Row label="Weight">
            <select
              value={t.fontWeight}
              onChange={(e) => setT("fontWeight", Number(e.target.value))}
              className="border border-border rounded px-1.5 h-6 text-[10px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]"
            >
              {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </Row>
          <Row label="Align">
            <div className="flex border border-border rounded overflow-hidden">
              {(["left", "center", "right"] as const).map((a, i) => (
                <button
                  key={a}
                  onClick={() => setT("textAlign", a)}
                  className={`w-7 h-6 flex items-center justify-center transition-colors ${t.textAlign === a ? "bg-[color:var(--accent-teal)] text-white" : "text-muted-foreground hover:text-ink"}`}
                >
                  {[<AlignLeft size={10} />, <AlignCenter size={10} />, <AlignRight size={10} />][i]}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Color">
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={toHex(t.color)}
                onChange={(e) => setT("color", e.target.value)}
                className="w-6 h-6 rounded border border-border cursor-pointer"
              />
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[100px]">{t.color}</span>
            </div>
          </Row>
        </Section>
      )}

      {el && sh && (
        <Section label="Shape">
          <Row label="Fill">
            <input
              type="color"
              value={toHex(sh.fill)}
              onChange={(e) => onChange((el) => ({ ...el, shape: { ...el.shape!, fill: e.target.value } }))}
              className="w-6 h-6 rounded border border-border cursor-pointer"
            />
          </Row>
          <Row label="Radius">
            <div className="flex items-center gap-1.5">
              <input
                type="range" min={0} max={100} value={sh.borderRadius}
                onChange={(e) => onChange((el) => ({ ...el, shape: { ...el.shape!, borderRadius: Number(e.target.value) } }))}
                className="w-24 accent-[color:var(--accent-teal)]"
              />
              <span className="font-mono text-[10px] w-6">{sh.borderRadius}</span>
            </div>
          </Row>
        </Section>
      )}

      {el && (
        <Section label="Opacity">
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={1} step={0.05} value={el.opacity}
              onChange={(e) => onChange((el) => ({ ...el, opacity: Number(e.target.value) }))}
              className="flex-1 accent-[color:var(--accent-teal)]"
            />
            <span className="font-mono text-[10px] w-8 text-right">{Math.round(el.opacity * 100)}%</span>
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Arrange panel ────────────────────────────────────────────────────────────
interface ArrangePanelProps {
  el: SlideElement | null;
  onChange: (fn: (e: SlideElement) => SlideElement) => void;
  onBringForward: () => void;
  onSendBack: () => void;
}

function ArrangePanel({ el, onChange, onBringForward, onSendBack }: ArrangePanelProps) {
  const p = el?.placement;

  const pctLabel = (v: number, max: number) => `${((v / max) * 100).toFixed(1)}%`;
  const setPlacement = (key: keyof GridPlacement, raw: string) => {
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || !el) return;
    onChange((e) => ({ ...e, placement: { ...e.placement, [key]: snap(num) } }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      {!el && <div className="text-center text-muted-foreground py-8 text-[11px]">Select an element to arrange</div>}

      {el && p && (
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
                  type="number" min={-180} max={180} value={el.rotation}
                  onChange={(e) => onChange((el) => ({ ...el, rotation: Number(e.target.value) }))}
                  className="w-16 px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]"
                />
                <span className="text-muted-foreground">°</span>
              </div>
            </Row>
          </Section>

          <Section label="Layer">
            <Row label="Z-index"><span className="font-mono text-[10px]">{el.zIndex}</span></Row>
            <div className="flex gap-1.5 mt-1">
              <button onClick={onBringForward} className="flex-1 py-1.5 text-[10px] font-medium border border-border rounded hover:bg-canvas/50 transition-colors">Bring forward</button>
              <button onClick={onSendBack}     className="flex-1 py-1.5 text-[10px] font-medium border border-border rounded hover:bg-canvas/50 transition-colors">Send back</button>
            </div>
          </Section>
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
function Select({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1 px-2 h-7 text-[11px] border border-border rounded hover:bg-canvas/40 transition-colors">
      {label} <ChevronDown size={11} />
    </button>
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
