import { useEffect, useRef } from "react";
import { Link } from "lucide-react";
import type { ContentNode, TextPayload, ImagePayload, VideoPayload } from "@/lib/ir";

interface Props {
  node: ContentNode;
  selected: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onMeasure?: (height: number) => void;
  onBeginWire?: (e: React.MouseEvent) => void;
  zoom: number;
}

const ROLE_LABEL: Record<TextPayload["role"], string> = {
  header:    "H1",
  subheader: "H2",
  body:      "BODY",
  bullet:    "LIST",
  stat:      "STAT",
  quote:     "QUOTE",
  // backward compat
  claim:     "H1",
  evidence:  "BODY",
  aside:     "QUOTE",
};

const ROLE_TEXT_CLASS: Record<TextPayload["role"], string> = {
  header:    "text-[16px] font-bold leading-tight text-ink",
  subheader: "text-[14px] font-semibold leading-tight text-ink",
  body:      "text-[12px] font-normal leading-snug text-ink",
  bullet:    "text-[12px] font-normal leading-snug text-ink",
  stat:      "text-[20px] font-extrabold leading-none text-ink",
  quote:     "text-[11px] italic leading-snug text-muted-foreground",
  // backward compat
  claim:     "text-[16px] font-bold leading-tight text-ink",
  evidence:  "text-[12px] font-normal leading-snug text-ink",
  aside:     "text-[11px] italic leading-snug text-muted-foreground",
};

export function ContentNodeCard({
  node,
  selected,
  dimmed = false,
  onSelect,
  onMove,
  onMeasure,
  onBeginWire,
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
  const videoPayload = node.kind === "video" ? (node.payload as VideoPayload) : null;

  return (
    <div
      className="absolute select-none transition-opacity group"
      style={{ left: pos.x, top: pos.y, width: 220, opacity: dimmed ? 0.4 : 1 }}
      onMouseDown={onMouseDown}
    >
      {/* Connect port — top-center, drag to assign to a slide */}
      {onBeginWire && (
        <button
          type="button"
          title="Drag to assign to a slide"
          data-no-drag
          onMouseDown={(e) => { e.stopPropagation(); onBeginWire(e); }}
          className="absolute left-1/2 -translate-x-1/2 -top-3 z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[var(--accent)] text-white border-2 border-white shadow-[var(--sh-v)] cursor-grab opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
        >
          <Link size={10} strokeWidth={2.5} />
        </button>
      )}

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
            {textPayload ? ROLE_LABEL[textPayload.role] : videoPayload ? "VIDEO" : node.kind}
          </span>
        </div>

        {/* Text content — styled per role so the card previews the actual slide style */}
        {textPayload && (
          <p className={`px-3 pb-3 ${ROLE_TEXT_CLASS[textPayload.role]}`}>
            {textPayload.text}
          </p>
        )}

        {/* Video content */}
        {videoPayload && (
          <div className="px-3 pb-3">
            <div className="w-full h-14 rounded-lg bg-canvas border border-border flex flex-col items-center justify-center gap-1">
              <span className="text-[16px]">▶</span>
              <span className="font-mono text-[9px] text-muted-foreground truncate max-w-[180px]">
                {videoPayload.url || "No URL"}
              </span>
            </div>
            {videoPayload.caption && (
              <span className="block mt-1 text-[10px] text-muted-foreground truncate">
                {videoPayload.caption}
              </span>
            )}
          </div>
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
