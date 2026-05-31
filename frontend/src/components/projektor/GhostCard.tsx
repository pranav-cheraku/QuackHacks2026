import { useEffect, useRef } from "react";
import { Check, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import type { SlideNode } from "@/lib/projektor-data";

interface Props {
  node: SlideNode;
  selected: boolean;
  dimmed?: boolean;
  /** Highlight as the live drop target while an arrow is being re-wired. */
  dropTarget?: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onAccept: () => void;
  onDiscard: () => void;
  onReconsider: () => void;
  onDelete: () => void;
  /** Reports the card's real rendered height so edges anchor flush to it. */
  onMeasure?: (height: number) => void;
  zoom: number;
}

// An AI-suggested branch: a provisional, dashed-border card with Accept /
// Discard. Discarding doesn't delete it — it stays dimmed and revisitable.
export function GhostCard({
  node,
  selected,
  dimmed = false,
  dropTarget = false,
  onSelect,
  onMove,
  onAccept,
  onDiscard,
  onReconsider,
  onDelete,
  onMeasure,
  zoom,
}: Props) {
  const dragging = useRef<{ ox: number; oy: number } | null>(null);
  const w = node.width ?? 300;
  const discarded = Boolean(node.discarded);

  // Report real rendered height so edges/affordances anchor flush to the card.
  const cardRef = useRef<HTMLDivElement>(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    // Skip 0 (e.g. while the board is hidden via display:none) so we keep the
    // last real height instead of collapsing arrow anchors to the card top.
    const report = () => {
      const h = el.offsetHeight;
      if (h > 0) onMeasureRef.current?.(h);
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      className="absolute select-none transition-opacity"
      style={{ left: node.x, top: node.y, width: w, opacity: dimmed ? 0.4 : 1 }}
      onMouseDown={onMouseDown}
    >
      <div
        ref={cardRef}
        className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
          dropTarget
            ? "ring-[3px] ring-[color:var(--accent)] shadow-[0_0_0_6px_var(--accent-soft)]"
            : selected
              ? "ring-2 ring-[color:var(--accent)]"
              : ""
        }`}
        style={{
          borderColor: discarded ? "var(--border)" : "var(--accent-line)",
          background: discarded ? "var(--surface-2)" : "var(--bg-tint)",
        }}
      >
        {/* SUGGESTED eyebrow + permanent delete */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider font-semibold"
            style={{
              color: discarded ? "var(--muted-foreground)" : "var(--accent)",
            }}
          >
            <Sparkles size={11} />
            {discarded ? "Discarded" : "Suggested"}
          </span>
          <button
            data-no-drag
            onClick={onDelete}
            aria-label="Delete permanently"
            title="Delete permanently"
            className="ml-auto text-faint hover:text-danger transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Title */}
        <div className="mt-1.5 font-serif text-[20px] leading-[1.15] text-ink">
          {node.title}
        </div>

        {/* Rationale */}
        {node.rationale && (
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
            {node.rationale}
          </p>
        )}

        {/* Actions */}
        {discarded ? (
          <div className="mt-3.5 flex items-center">
            <button
              data-no-drag
              onClick={onReconsider}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-ink-soft hover:text-ink transition-colors"
            >
              <RotateCcw size={12} /> Reconsider
            </button>
          </div>
        ) : (
          <div className="mt-3.5 flex items-center gap-2">
            <button
              data-no-drag
              onClick={onDiscard}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-ink-soft border border-border bg-chrome hover:text-ink transition-colors"
            >
              <X size={13} /> Discard
            </button>
            <button
              data-no-drag
              onClick={onAccept}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <Check size={13} strokeWidth={2.5} /> Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
