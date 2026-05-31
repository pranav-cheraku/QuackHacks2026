import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import type { SlideNode, SceneKind, SceneStatus } from "@/lib/projektor-data";
import type { ContentNode, TextPayload } from "@/lib/ir";

interface Props {
  node: SlideNode;
  selected: boolean;
  dimmed?: boolean;
  /** Highlight as the live drop target while an arrow is being re-wired. */
  dropTarget?: boolean;
  onSelect: (shiftKey: boolean) => void;
  onOpenEditor: () => void;
  onMove: (x: number, y: number) => void;
  /** Reports the card's real rendered height so edges anchor flush to it. */
  onMeasure?: (height: number) => void;
  zoom: number;
  /** ContentNodes currently assigned to this slide — drives the graph preview. */
  connectedContent?: ContentNode[];
}

const KIND_LABEL: Record<SceneKind, string> = {
  title: "TITLE",
  problem: "PROBLEM",
  data: "DATA",
};

const STATUS_LABEL: Record<SceneStatus, string> = {
  final: "Final",
  draft: "Draft",
  "in-review": "In Review",
};

const STATUS_DOT: Record<SceneStatus, string> = {
  final: "var(--ok)", // green
  "in-review": "var(--warn)", // orange
  draft: "var(--danger)", // red
};

export function SlideCard({
  node,
  selected,
  dimmed = false,
  dropTarget = false,
  onSelect,
  onOpenEditor,
  onMove,
  onMeasure,
  zoom,
  connectedContent,
}: Props) {
  const dragging = useRef<{ ox: number; oy: number } | null>(null);
  const w = node.width ?? 320;

  // Report the real rendered height (canvas units — clientHeight ignores the
  // ancestor's scale transform) so edges/affordances anchor flush to the card.
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
    onSelect(e.shiftKey);
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
      onDoubleClick={onOpenEditor}
    >
      <div
        ref={cardRef}
        className={`rounded-2xl bg-card border transition-all ${
          dropTarget
            ? "border-transparent ring-[3px] ring-[color:var(--accent)] shadow-[0_0_0_6px_var(--accent-soft)]"
            : selected
              ? "border-transparent ring-2 ring-[color:var(--accent)] shadow-[var(--sh-v)]"
              : "border-border shadow-[0_2px_10px_-4px_rgba(40,30,20,0.12)]"
        }`}
      >
        {/* Top row: number · eyebrow · check */}
        <div className="flex items-center gap-2 px-4 pt-3.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink text-white font-mono text-[11px] font-semibold shrink-0">
            {String(node.index).padStart(2, "0")}
          </span>
          {node.eyebrow && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {node.eyebrow}
            </span>
          )}
          {node.status === "final" && (
            <span
              className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <Check size={11} strokeWidth={3} />
            </span>
          )}
        </div>

        {/* Title */}
        <div className="px-4 pt-2 font-serif text-[22px] leading-[1.12] text-ink">
          {node.title}
        </div>

        {/* Preview */}
        <div className="px-4 pt-3 pb-4">
          <Preview node={node} connectedContent={connectedContent} />
        </div>
      </div>

      {/* Below card: type label · status pill */}
      <div className="mt-2 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {KIND_LABEL[node.kind]}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: STATUS_DOT[node.status] }}
          />
          {STATUS_LABEL[node.status]}
        </span>
      </div>
    </div>
  );
}

const ROLE_CHIP: Partial<Record<TextPayload["role"], string>> = {
  header:    "H1",
  subheader: "H2",
  body:      "Body",
  bullet:    "List",
  stat:      "Stat",
  quote:     "Quote",
  // backward compat
  claim:     "H1",
  evidence:  "Body",
  aside:     "Quote",
};

function contentLabel(cn: ContentNode): string {
  if (cn.kind === "image") return "Image";
  if (cn.kind === "video") return "Video";
  if (cn.kind === "data")  return "Chart";
  return ROLE_CHIP[(cn.payload as TextPayload).role] ?? "Text";
}

function contentPreview(cn: ContentNode): string {
  if (cn.kind === "image") return (cn.payload as { url: string }).url ? "Image" : "Image (empty)";
  if (cn.kind === "video") return (cn.payload as { url: string }).url || "Video";
  if (cn.kind === "data")  return "Chart";
  const text = (cn.payload as TextPayload).text;
  return text.length > 44 ? text.slice(0, 44) + "…" : text;
}

function Preview({ node, connectedContent }: { node: SlideNode; connectedContent?: ContentNode[] }) {
  if (connectedContent && connectedContent.length > 0) {
    return (
      <div className="space-y-1.5 py-0.5">
        {connectedContent.slice(0, 5).map((cn) => (
          <div key={cn.id} className="flex items-baseline gap-2 min-w-0">
            <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-wide text-[color:var(--accent)] bg-[color:var(--accent-soft)] px-1.5 py-0.5 rounded-sm">
              {contentLabel(cn)}
            </span>
            <span className="text-[11px] text-muted-foreground leading-snug truncate">
              {contentPreview(cn)}
            </span>
          </div>
        ))}
        {connectedContent.length > 5 && (
          <span className="text-[10px] text-muted-foreground pl-0.5">
            +{connectedContent.length - 5} more
          </span>
        )}
      </div>
    );
  }

  // No content connected — blank preview for all slide kinds
  return null;
}
