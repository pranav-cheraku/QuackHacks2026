import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ArrowLeft, X } from "lucide-react";
import { AddContent } from "./AddContent";
import { blockIcon } from "@/lib/content-blocks";
import type { ContentBlock, SlideNode } from "@/lib/projektor-data";

interface Props {
  scene: SlideNode;
  onBack: () => void;
  onAddBlock: (id: string, block: Omit<ContentBlock, "id">) => void;
  onRemoveBlock: (id: string, blockId: string) => void;
  onMoveBlock: (id: string, blockId: string, cx: number, cy: number) => void;
}

const SCENE_W = 268;
const SCENE_H = 92;
const BLOCK_W = 190;
const BLOCK_H = 62;
const GAP_X = 28;
const SCENE_X = 600;
const SCENE_Y = 80;
const BLOCK_Y = SCENE_Y + SCENE_H + 110;
const SCENE_BOTTOM = { x: SCENE_X + SCENE_W / 2, y: SCENE_Y + SCENE_H };

// The content graph: one scene's blocks as their own little canvas — the scene
// pinned at top, its content "ingredients" tethered below. Blocks are freely
// draggable; the canvas pans (drag) and zooms (⌘/ctrl + wheel or pinch). Adding
// happens via the floating button. Filling in text still lives in Slides View.
export function ContentGraphView({
  scene,
  onBack,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
}: Props) {
  const blocks = scene.blocks ?? [];
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef({ pan, zoom });
  viewRef.current = { pan, zoom };
  const panRef = useRef<{ x: number; y: number } | null>(null);

  // Auto-row fallback for a block that hasn't been dragged yet.
  const defaultPos = (i: number) => {
    const rowWidth = blocks.length * BLOCK_W + (blocks.length - 1) * GAP_X;
    const startX = SCENE_BOTTOM.x - rowWidth / 2;
    return { x: startX + i * (BLOCK_W + GAP_X), y: BLOCK_Y };
  };
  const posOf = (b: ContentBlock, i: number) =>
    b.cx != null && b.cy != null ? { x: b.cx, y: b.cy } : defaultPos(i);

  // Center the scene horizontally when the page opens.
  useEffect(() => {
    const vp = viewportRef.current;
    if (vp) setPan({ x: vp.clientWidth / 2 - SCENE_BOTTOM.x, y: 64 });
  }, []);

  // ⌘/ctrl + wheel and trackpad pinch → cursor-anchored zoom (native listener,
  // non-passive so preventDefault works; React's onWheel is passive in 19).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { pan: p, zoom: z } = viewRef.current;
      const next = Math.min(2, Math.max(0.3, z * Math.exp(-e.deltaY * 0.009)));
      if (next === z) return;
      const r = vp.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const cx = (mx - p.x) / z;
      const cy = (my - p.y) / z;
      setZoom(Number(next.toFixed(4)));
      setPan({ x: mx - cx * next, y: my - cy * next });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  const onCanvasMouseDown = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-cnode]")) return;
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

  const startBlockDrag = (b: ContentBlock, i: number, e: ReactMouseEvent) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    const start = posOf(b, i);
    const z = viewRef.current.zoom;
    const ox = e.clientX;
    const oy = e.clientY;
    const move = (ev: MouseEvent) =>
      onMoveBlock(
        scene.id,
        b.id,
        start.x + (ev.clientX - ox) / z,
        start.y + (ev.clientY - oy) / z,
      );
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Breadcrumb header */}
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border bg-chrome shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-semibold text-ink hover:bg-canvas/70 transition-colors"
        >
          <ArrowLeft size={15} /> Back to graph
        </button>
        <div className="h-5 w-px bg-border mx-1" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          Content
        </span>
        <span className="font-serif text-[16px] text-ink truncate">
          {scene.title}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={viewportRef}
        onMouseDown={onCanvasMouseDown}
        className="flex-1 relative overflow-hidden dot-grid cursor-grab active:cursor-grabbing"
      >
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* edges scene → block */}
          <svg
            className="absolute pointer-events-none"
            style={{
              left: 0,
              top: 0,
              width: 3000,
              height: 2000,
              overflow: "visible",
            }}
          >
            <defs>
              <marker
                id="content-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L6,4 L0,8 Z" fill="var(--accent)" />
              </marker>
            </defs>
            {blocks.map((b, i) => {
              const p = posOf(b, i);
              const bx = p.x + BLOCK_W / 2;
              const a = SCENE_BOTTOM;
              return (
                <path
                  key={b.id}
                  d={`M ${a.x} ${a.y} C ${a.x} ${a.y + 50}, ${bx} ${p.y - 50}, ${bx} ${p.y}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeOpacity={0.5}
                  strokeWidth="1.5"
                  markerEnd="url(#content-arrow)"
                />
              );
            })}
          </svg>

          {/* Scene node (fixed) */}
          <div
            data-cnode
            className="absolute rounded-2xl bg-card border border-border shadow-[var(--sh-v)] px-4 py-3 select-none"
            style={{ left: SCENE_X, top: SCENE_Y, width: SCENE_W }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink text-white font-mono text-[11px] font-semibold shrink-0">
                {String(scene.index).padStart(2, "0")}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {scene.kind}
              </span>
            </div>
            <div className="mt-1.5 font-serif text-[18px] leading-tight text-ink truncate">
              {scene.title}
            </div>
          </div>

          {/* Block nodes (draggable) */}
          {blocks.map((b, i) => {
            const Icon = blockIcon(b.type);
            const p = posOf(b, i);
            return (
              <div
                key={b.id}
                data-cnode
                onMouseDown={(e) => startBlockDrag(b, i, e)}
                className="group absolute flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3 cursor-grab active:cursor-grabbing select-none"
                style={{ left: p.x, top: p.y, width: BLOCK_W, height: BLOCK_H }}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-canvas text-ink-soft shrink-0">
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {b.type}
                  </span>
                  <span className="block text-[13px] text-ink truncate">
                    {b.label}
                  </span>
                </span>
                <button
                  type="button"
                  data-no-drag
                  aria-label={`Remove ${b.type}`}
                  onClick={() => onRemoveBlock(scene.id, b.id)}
                  className="text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="text-[13px] text-muted-foreground">No content yet.</p>
            <p className="text-[12px] text-faint mt-0.5">
              Use the button below to add this scene’s ingredients.
            </p>
          </div>
        )}

        {/* Floating add-content button (on the canvas) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-5"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <AddContent
            variant="pill"
            onAdd={(block) => onAddBlock(scene.id, block)}
          />
        </div>
      </div>
    </div>
  );
}
