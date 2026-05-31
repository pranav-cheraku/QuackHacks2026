import { useEffect, useRef } from "react";
import type { ContentNode, TextPayload, ImagePayload } from "@/lib/ir";

interface Props {
  node: ContentNode;
  selected: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onMeasure?: (height: number) => void;
  zoom: number;
}

const ROLE_LABEL: Record<TextPayload["role"], string> = {
  claim:    "CLAIM",
  evidence: "EVIDENCE",
  aside:    "ASIDE",
};

export function ContentNodeCard({
  node,
  selected,
  dimmed = false,
  onSelect,
  onMove,
  onMeasure,
  zoom,
}: Props) {
  const dragging = useRef<{ ox: number; oy: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;

  const pos = node.graphPosition ?? { x: 0, y: 0 };

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
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
    const startX = pos.x;
    const startY = pos.y;
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

  const textPayload = node.kind === "text" ? (node.payload as TextPayload) : null;
  const imagePayload = node.kind === "image" ? (node.payload as ImagePayload) : null;

  return (
    <div
      className="absolute select-none transition-opacity"
      style={{ left: pos.x, top: pos.y, width: 220, opacity: dimmed ? 0.4 : 1 }}
      onMouseDown={onMouseDown}
    >
      <div
        ref={cardRef}
        className={`rounded-xl bg-card border transition-all cursor-grab active:cursor-grabbing ${
          selected
            ? "border-transparent ring-2 ring-[color:var(--accent)] shadow-[var(--sh-v)]"
            : "border-border shadow-[0_2px_8px_-3px_rgba(40,30,20,0.10)]"
        }`}
      >
        {/* Kind / role badge */}
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "var(--accent)" }}
          />
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {textPayload ? ROLE_LABEL[textPayload.role] : node.kind}
          </span>
        </div>

        {/* Text content */}
        {textPayload && (
          <p className="px-3 pb-3 text-[12.5px] leading-snug text-ink line-clamp-3">
            {textPayload.text}
          </p>
        )}

        {/* Image content */}
        {imagePayload && (
          <div className="px-3 pb-3">
            {imagePayload.url ? (
              <img
                src={imagePayload.url}
                alt={imagePayload.caption ?? ""}
                className="w-full h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-20 rounded-lg bg-canvas flex items-center justify-center">
                <span className="font-mono text-[10px] text-muted-foreground">No image</span>
              </div>
            )}
            {imagePayload.caption && (
              <span className="block mt-1 text-[10px] text-muted-foreground truncate">
                {imagePayload.caption}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
