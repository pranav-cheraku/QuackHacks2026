import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  makeTextElement, makeShapeElement, makeImageElement, nextId,
} from "@/lib/slide-model";
import type { SlideElement, TextStyle } from "@/lib/slide-model";
import {
  gridToCSS, GRID_COLS, GRID_ROWS, snap, SNAP_STEP,
} from "@/lib/grid";
import type { GridPlacement } from "@/lib/grid";

interface Props { startNodeId: string | null; }
type RightTab = "agent" | "design" | "arrange";
type HandlePos = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

// ─── EditorView ───────────────────────────────────────────────────────────────
export function EditorView({ startNodeId }: Props) {
  const [slides, setSlides] = useState<SlideNode[]>(() =>
    INITIAL_NODES.map((n) => ({ ...n, elements: n.elements ?? [] }))
  );
  const [activeId, setActiveId] = useState(startNodeId ?? "n1");
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [editingElId, setEditingElId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("agent");
  const [showGrid, setShowGrid] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const activeSlide = slides.find((s) => s.id === activeId) ?? slides[0];
  const selectedEl = activeSlide?.elements.find((e) => e.id === selectedElId) ?? null;

  // ── Slide / element helpers ──────────────────────────────────────────────
  const updateSlide = useCallback(
    (slideId: string, fn: (s: SlideNode) => SlideNode) =>
      setSlides((prev) => prev.map((s) => (s.id === slideId ? fn(s) : s))),
    []
  );

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
    setSlides((prev) => [...prev, newSlide]);
    setActiveId(newSlide.id);
    setSelectedElId(null);
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingElId) return;
      if (!selectedElId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        deleteEl(selectedElId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateEl(selectedElId);
      }
      if (e.key === "Escape") {
        setEditingElId(null);
        setSelectedElId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedElId, editingElId, deleteEl, duplicateEl]);

  // ── Move / resize callbacks ──────────────────────────────────────────────
  const commitMove = (id: string, p: GridPlacement) =>
    updateEl(id, (e) => ({ ...e, placement: p }));

  const commitResize = (id: string, p: GridPlacement) =>
    updateEl(id, (e) => ({ ...e, placement: p }));

  const commitText = (id: string, content: string) => {
    updateEl(id, (e) => ({ ...e, text: { ...e.text!, content } }));
    setEditingElId(null);
  };

  // ── Layer order ──────────────────────────────────────────────────────────
  const bringForward = (id: string) =>
    updateEl(id, (e) => ({ ...e, zIndex: e.zIndex + 1 }));
  const sendBack = (id: string) =>
    updateEl(id, (e) => ({ ...e, zIndex: Math.max(0, e.zIndex - 1) }));

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-chrome"
      onClick={() => { setSelectedElId(null); setEditingElId(null); }}
    >
      {/* ── Toolbar ── */}
      <div className="h-10 border-b border-border bg-chrome flex items-center px-3 gap-1 shrink-0 text-[12px]" onClick={(e) => e.stopPropagation()}>
        <ToolBtn><Undo2 size={13} /></ToolBtn>
        <ToolBtn><Redo2 size={13} /></ToolBtn>
        <Sep />
        {/* Text formatting — only active when a text element is selected */}
        <Select label={selectedEl?.text ? `${selectedEl.text.fontSize}px` : "Size"} />
        <Sep />
        <ToolBtn
          active={selectedEl?.text?.fontWeight === 700}
          onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({ ...e, text: { ...e.text!, fontWeight: e.text!.fontWeight >= 700 ? 400 : 700 } }))}
        >
          <Bold size={12} />
        </ToolBtn>
        <ToolBtn
          active={selectedEl?.text?.fontStyle === "italic"}
          onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({ ...e, text: { ...e.text!, fontStyle: e.text!.fontStyle === "italic" ? "normal" : "italic" } }))}
        >
          <Italic size={12} />
        </ToolBtn>
        <ToolBtn
          active={selectedEl?.text?.textDecoration === "underline"}
          onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({ ...e, text: { ...e.text!, textDecoration: e.text!.textDecoration === "underline" ? "none" : "underline" } }))}
        >
          <Underline size={12} />
        </ToolBtn>
        <Sep />
        {(["left", "center", "right"] as const).map((align, i) => (
          <ToolBtn
            key={align}
            active={selectedEl?.text?.textAlign === align}
            onClick={() => selectedEl && updateEl(selectedEl.id, (e) => ({ ...e, text: { ...e.text!, textAlign: align } }))}
          >
            {[<AlignLeft size={12} />, <AlignCenter size={12} />, <AlignRight size={12} />][i]}
          </ToolBtn>
        ))}
        <Sep />
        {/* Insert buttons */}
        <ToolBtn title="Add text" onClick={() => addEl(makeTextElement())}><Type size={12} /></ToolBtn>
        <ToolBtn title="Add image" onClick={() => addEl(makeImageElement())}><ImageIcon size={12} /></ToolBtn>
        <ToolBtn title="Add shape" onClick={() => addEl(makeShapeElement())}><Square size={12} /></ToolBtn>
        <ToolBtn title="Layout"><LayoutTemplate size={12} /></ToolBtn>
        <Sep />
        {/* Element actions (visible when something selected) */}
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
        <aside className="w-[180px] shrink-0 border-r border-border bg-chrome flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex-1 overflow-y-auto py-2">
            {slides.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveId(s.id); setSelectedElId(null); setEditingElId(null); }}
                className={`w-full px-3 py-1.5 flex gap-2.5 items-start text-left transition-all ${activeId === s.id ? "bg-[color:var(--accent-soft)]" : "hover:bg-canvas/50"}`}
              >
                <span className="text-[10px] font-mono text-muted-foreground pt-1 w-4 shrink-0 text-right">{s.index}</span>
                <div
                  className={`flex-1 rounded border overflow-hidden bg-white transition-all ${activeId === s.id ? "border-[color:var(--accent-teal)] shadow-[0_0_0_2px_var(--accent-soft)]" : "border-border"}`}
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

            {/* Static template content */}
            <div className="absolute right-0 top-0 h-full w-12 flex items-center justify-center" style={{ background: "var(--accent-teal)" }}>
              <div className="text-white font-mono text-[10px] tracking-[0.4em] font-bold" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>PROJEKTOR</div>
            </div>
            <div className="p-12 h-full flex flex-col" style={{ pointerEvents: "none" }}>
              <div className="text-[12px] font-mono uppercase tracking-[0.25em] font-bold" style={{ color: "var(--accent-teal)" }}>Q3 · FY26</div>
              <div className="mt-10 text-[72px] leading-[0.95] font-extrabold text-ink tracking-tight">
                {activeSlide.title === "Title" ? "Strategy Review" : activeSlide.title}
              </div>
              <div className="mt-6 text-[18px] text-muted-foreground max-w-xl leading-snug">
                Aligning Q4 priorities across product, sales, and operations — what's working, what's next.
              </div>
            </div>

            {/* ── Live element layer ── */}
            {[...activeSlide.elements]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => (
                <CanvasElement
                  key={el.id}
                  el={el}
                  selected={selectedElId === el.id}
                  editing={editingElId === el.id}
                  slideRef={slideRef}
                  onSelect={() => { setSelectedElId(el.id); setEditingElId(null); }}
                  onStartEdit={() => setEditingElId(el.id)}
                  onCommitText={(txt) => commitText(el.id, txt)}
                  onMove={(p) => commitMove(el.id, p)}
                  onResize={(p) => commitResize(el.id, p)}
                />
              ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <aside className="w-[280px] shrink-0 border-l border-border bg-chrome flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex border-b border-border shrink-0">
            {(
              [
                { id: "agent", label: "Agent", icon: Sparkles },
                { id: "design", label: "Design", icon: SlidersHorizontal },
                { id: "arrange", label: "Arrange", icon: Layers },
              ] as { id: RightTab; label: string; icon: React.FC<{ size: number }> }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${rightTab === id ? "text-ink border-b-2 border-[color:var(--accent-teal)] -mb-px" : "text-muted-foreground hover:text-ink"}`}
              >
                <Icon size={11} />{label}
              </button>
            ))}
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {rightTab === "agent" && <AgentPanel />}
            {rightTab === "design" && (
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
  const [livePlacement, setLivePlacement] = useState<GridPlacement | null>(null);
  const drag = useRef<{
    type: "move" | HandlePos;
    startMx: number; startMy: number;
    startPlacement: GridPlacement;
  } | null>(null);

  const active = livePlacement ?? el.placement;
  const css = gridToCSS(active);

  const startDrag = (type: "move" | HandlePos, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    drag.current = { type, startMx: e.clientX, startMy: e.clientY, startPlacement: el.placement };

    const onMouseMove = (ev: MouseEvent) => {
      if (!drag.current || !slideRef.current) return;
      const rect = slideRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - drag.current.startMx) / rect.width) * GRID_COLS;
      const dy = ((ev.clientY - drag.current.startMy) / rect.height) * GRID_ROWS;
      const sp = drag.current.startPlacement;

      let p: GridPlacement;
      if (drag.current.type === "move") {
        const col = snap(sp.col + dx);
        const row = snap(sp.row + dy);
        p = {
          col: Math.max(0, Math.min(GRID_COLS - sp.colSpan, col)),
          row: Math.max(0, Math.min(GRID_ROWS - sp.rowSpan, row)),
          colSpan: sp.colSpan,
          rowSpan: sp.rowSpan,
        };
      } else {
        p = applyResize(drag.current.type as HandlePos, sp, dx, dy);
      }
      setLivePlacement(p);
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (drag.current && slideRef.current) {
        const rect = slideRef.current.getBoundingClientRect();
        const dx = ((ev.clientX - drag.current.startMx) / rect.width) * GRID_COLS;
        const dy = ((ev.clientY - drag.current.startMy) / rect.height) * GRID_ROWS;
        const moved = Math.abs(dx) > 5 || Math.abs(dy) > 5;

        if (!moved && drag.current.type === "move") {
          if (selected) onStartEdit();
        } else if (livePlacement) {
          drag.current.type === "move" ? onMove(livePlacement) : onResize(livePlacement);
        }
      }
      drag.current = null;
      setLivePlacement(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      style={{
        ...css,
        opacity: el.opacity,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        cursor: editing ? "text" : "move",
        zIndex: el.zIndex + 5,
        userSelect: editing ? "text" : "none",
      }}
      onMouseDown={(e) => { onSelect(); if (!editing) startDrag("move", e); }}
    >
      {/* Content */}
      {el.type === "text" && (
        editing ? (
          <textarea
            autoFocus
            defaultValue={el.text?.content}
            onBlur={(e) => onCommitText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { onCommitText((e.target as HTMLTextAreaElement).value); } }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", height: "100%", resize: "none",
              background: "transparent", border: "none", outline: "none",
              fontSize: el.text?.fontSize, fontWeight: el.text?.fontWeight,
              fontStyle: el.text?.fontStyle, color: el.text?.color,
              textAlign: el.text?.textAlign, textDecoration: el.text?.textDecoration,
              fontFamily: "inherit", lineHeight: 1.4, padding: "4px",
              cursor: "text",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%", height: "100%", padding: "4px",
              fontSize: el.text?.fontSize, fontWeight: el.text?.fontWeight,
              fontStyle: el.text?.fontStyle, color: el.text?.color,
              textAlign: el.text?.textAlign,
              textDecoration: el.text?.textDecoration,
              lineHeight: 1.4, wordBreak: "break-word", overflow: "hidden",
              whiteSpace: "pre-wrap",
            }}
          >
            {el.text?.content}
          </div>
        )
      )}
      {el.type === "shape" && (
        <div style={{
          width: "100%", height: "100%",
          background: el.shape?.fill,
          borderRadius: el.shape?.borderRadius,
          border: el.shape?.strokeWidth
            ? `${el.shape.strokeWidth}px solid ${el.shape.stroke}`
            : undefined,
        }} />
      )}
      {el.type === "image" && (
        el.src ? (
          <img src={el.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "oklch(0.94 0.015 192 / 0.3)",
            border: "2px dashed oklch(0.54 0.105 192 / 0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 6, color: "oklch(0.54 0.105 192)",
          }}>
            <ImageIcon size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 11, opacity: 0.7 }}>Drop image here</span>
          </div>
        )
      )}

      {/* Selection overlay */}
      {selected && !editing && (
        <div
          style={{
            position: "absolute", inset: -2,
            border: "2px solid oklch(0.54 0.105 192)",
            borderRadius: 1, pointerEvents: "none", zIndex: 1,
          }}
        >
          {/* Resize handles */}
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
                zIndex: 2,
                ...HANDLE_STYLE[h],
              }}
              onMouseDown={(e) => startDrag(h, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function applyResize(handle: HandlePos, sp: GridPlacement, dx: number, dy: number): GridPlacement {
  let { col, row, colSpan, rowSpan } = sp;
  const minSpan = SNAP_STEP;

  if (handle.includes("e")) colSpan = Math.max(minSpan, snap(sp.colSpan + dx));
  if (handle.includes("w")) {
    const newCol = snap(Math.max(0, sp.col + dx));
    const delta = newCol - sp.col;
    colSpan = Math.max(minSpan, sp.colSpan - delta);
    col = sp.col + (sp.colSpan - colSpan);
  }
  if (handle.includes("s")) rowSpan = Math.max(minSpan, snap(sp.rowSpan + dy));
  if (handle.includes("n")) {
    const newRow = snap(Math.max(0, sp.row + dy));
    const delta = newRow - sp.row;
    rowSpan = Math.max(minSpan, sp.rowSpan - delta);
    row = sp.row + (sp.rowSpan - rowSpan);
  }

  return {
    col: Math.max(0, Math.min(GRID_COLS - colSpan, col)),
    row: Math.max(0, Math.min(GRID_ROWS - rowSpan, row)),
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
              { done: true, text: "Brand extracted → persimmon + pine palette" },
              { done: true, text: "7 scenes laid out, 6 passed first render" },
              { done: true, text: "Scene 04 re-balanced (was crowded)" },
              { done: false, text: "Checking the argument…" },
            ].map(({ done, text }, i) => (
              <div key={i} className="flex items-start gap-2">
                {done
                  ? <CheckCircle2 size={12} className="mt-px shrink-0" style={{ color: "var(--accent-teal)" }} />
                  : <Loader2 size={12} className="mt-px shrink-0 animate-spin text-muted-foreground" />}
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
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity" style={{ background: "var(--accent-teal)" }}><Send size={13} /></button>
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

function DesignPanel({ el, onChange }: DesignPanelProps) {
  const t = el?.text;
  const sh = el?.shape;

  const setTextProp = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) =>
    onChange((e) => ({ ...e, text: { ...e.text!, [key]: value } }));

  const FONTS = [16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96];
  const WEIGHTS = [{ label: "Regular", value: 400 }, { label: "Medium", value: 500 }, { label: "SemiBold", value: 600 }, { label: "Bold", value: 700 }, { label: "ExtraBold", value: 800 }];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      {!el && (
        <div className="text-center text-muted-foreground text-[11px] py-8">Select an element to edit its style</div>
      )}
      {el && (
        <>
          {t && (
            <Section label="Typography">
              <Row label="Size">
                <div className="flex items-center border border-border rounded h-6">
                  <button className="px-1.5 text-muted-foreground hover:text-ink" onClick={() => setTextProp("fontSize", Math.max(8, (t.fontSize || 24) - 2))}>−</button>
                  <span className="px-2 font-mono text-[10px] border-x border-border w-10 text-center">{t.fontSize}</span>
                  <button className="px-1.5 text-muted-foreground hover:text-ink" onClick={() => setTextProp("fontSize", (t.fontSize || 24) + 2)}>+</button>
                </div>
              </Row>
              <Row label="Weight">
                <select
                  value={t.fontWeight}
                  onChange={(e) => setTextProp("fontWeight", Number(e.target.value))}
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
                      onClick={() => setTextProp("textAlign", a)}
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
                    value={t.color.startsWith("#") ? t.color : "#1F2422"}
                    onChange={(e) => setTextProp("color", e.target.value)}
                    className="w-6 h-6 rounded border border-border cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{t.color}</span>
                </div>
              </Row>
            </Section>
          )}
          {sh && (
            <Section label="Shape">
              <Row label="Fill">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={sh.fill.startsWith("#") ? sh.fill : "#0d9488"}
                    onChange={(e) => onChange((el) => ({ ...el, shape: { ...el.shape!, fill: e.target.value } }))}
                    className="w-6 h-6 rounded border border-border cursor-pointer"
                  />
                </div>
              </Row>
              <Row label="Radius">
                <div className="flex items-center gap-1">
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
        </>
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

  const pct = (v: number, max: number) => `${((v / max) * 100).toFixed(1)}%`;
  const setP = (key: keyof GridPlacement, raw: string) => {
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || !el) return;
    onChange((e) => ({ ...e, placement: { ...e.placement, [key]: snap(num) } }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      {!el && (
        <div className="text-center text-muted-foreground text-[11px] py-8">Select an element to arrange</div>
      )}
      {el && p && (
        <>
          <Section label="Position (grid units)">
            <div className="grid grid-cols-2 gap-2">
              {[["X", "col", p.col] as const, ["Y", "row", p.row] as const].map(([label, key, val]) => (
                <div key={label}>
                  <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">
                    {label} <span className="opacity-60">({pct(val, key === "col" ? GRID_COLS : GRID_ROWS)})</span>
                  </div>
                  <input
                    key={val}
                    defaultValue={val}
                    onBlur={(e) => setP(key, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setP(key, (e.target as HTMLInputElement).value)}
                    className="w-full px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]"
                  />
                </div>
              ))}
            </div>
          </Section>
          <Section label="Size (grid units)">
            <div className="grid grid-cols-2 gap-2">
              {[["W", "colSpan", p.colSpan] as const, ["H", "rowSpan", p.rowSpan] as const].map(([label, key, val]) => (
                <div key={label}>
                  <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">
                    {label} <span className="opacity-60">({pct(val, key === "colSpan" ? GRID_COLS : GRID_ROWS)})</span>
                  </div>
                  <input
                    key={val}
                    defaultValue={val}
                    onBlur={(e) => setP(key, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setP(key, (e.target as HTMLInputElement).value)}
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
                  type="number" min={-180} max={180}
                  value={el.rotation}
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
              <button onClick={onSendBack} className="flex-1 py-1.5 text-[10px] font-medium border border-border rounded hover:bg-canvas/50 transition-colors">Send back</button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────
function ToolBtn({ children, title, active, onClick }: { children: React.ReactNode; title?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${active ? "bg-canvas text-ink" : "text-muted-foreground hover:text-ink hover:bg-canvas/60"}`}
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
