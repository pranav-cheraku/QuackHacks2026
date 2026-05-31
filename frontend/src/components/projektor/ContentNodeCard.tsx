import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import type { ContentNode, TextPayload, ImagePayload } from "@/lib/ir";

interface Props {
  node: ContentNode;
  selected: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onMeasure?: (height: number) => void;
  onDelete?: () => void;
  onChange?: (updated: ContentNode) => void;
  zoom: number;
}

const ROLES: TextPayload["role"][] = ["claim", "evidence", "aside"];

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
  onDelete,
  onChange,
  zoom,
}: Props) {
  const dragging = useRef<{ ox: number; oy: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;

  const [editing, setEditing] = useState(false);
  const textPayload = node.kind === "text" ? (node.payload as TextPayload) : null;
  const imagePayload = node.kind === "image" ? (node.payload as ImagePayload) : null;

  // Draft state for the edit form
  const [draftText, setDraftText] = useState(textPayload?.text ?? "");
  const [draftRole, setDraftRole] = useState<TextPayload["role"]>(textPayload?.role ?? "claim");
  const [draftUrl, setDraftUrl] = useState(imagePayload?.url ?? "");
  const [draftCaption, setDraftCaption] = useState(imagePayload?.caption ?? "");

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
    if (editing) return;
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

  const openEdit = () => {
    setDraftText(textPayload?.text ?? "");
    setDraftRole(textPayload?.role ?? "claim");
    setDraftUrl(imagePayload?.url ?? "");
    setDraftCaption(imagePayload?.caption ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    if (!onChange) { setEditing(false); return; }
    if (node.kind === "text") {
      onChange({ ...node, payload: { role: draftRole, text: draftText } });
    } else {
      const imagePayloadUpdate = draftCaption.trim()
        ? { url: draftUrl, caption: draftCaption.trim() }
        : { url: draftUrl };
      onChange({ ...node, kind: "image", payload: imagePayloadUpdate });
    }
    setEditing(false);
  };

  const badgeLabel = textPayload ? ROLE_LABEL[textPayload.role] : node.kind;

  return (
    <div
      className="absolute select-none transition-opacity group"
      style={{ left: pos.x, top: pos.y, width: 220, opacity: dimmed ? 0.4 : 1 }}
      onMouseDown={onMouseDown}
    >
      <div
        ref={cardRef}
        className={`rounded-xl bg-card border transition-all ${
          editing ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        } ${
          selected
            ? "border-transparent ring-2 ring-[color:var(--accent)] shadow-[var(--sh-v)]"
            : "border-border shadow-[0_2px_8px_-3px_rgba(40,30,20,0.10)]"
        }`}
      >
        {editing ? (
          /* ── Edit mode ── */
          <div className="px-3 pt-2.5 pb-3 space-y-2" data-no-drag>
            {node.kind === "text" ? (
              <>
                {/* Role toggles */}
                <div className="flex gap-1">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDraftRole(r)}
                      className={`flex-1 py-1 rounded-md font-mono text-[9px] uppercase tracking-wider transition-colors ${
                        draftRole === r
                          ? "text-white"
                          : "bg-canvas text-muted-foreground hover:text-ink"
                      }`}
                      style={draftRole === r ? { background: "var(--accent)" } : undefined}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
                {/* Text */}
                <textarea
                  autoFocus
                  rows={3}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-canvas text-[12.5px] text-ink leading-snug outline-none focus:border-[color:var(--accent)] transition-colors resize-none"
                />
              </>
            ) : (
              <>
                {/* Image URL */}
                <input
                  autoFocus
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="Image URL…"
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-canvas text-[12.5px] text-ink outline-none focus:border-[color:var(--accent)] transition-colors"
                />
                {/* Caption */}
                <input
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-canvas text-[12.5px] text-ink outline-none focus:border-[color:var(--accent)] transition-colors"
                />
              </>
            )}
            {/* Save / Cancel */}
            <div className="flex justify-end gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-muted-foreground border border-border hover:text-ink transition-colors"
              >
                <X size={11} /> Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                <Check size={11} /> Save
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <>
            {/* Kind / role badge + action buttons */}
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "var(--accent)" }}
              />
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground flex-1">
                {badgeLabel}
              </span>
              {/* Action buttons — visible on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-no-drag>
                {onChange && (
                  <button
                    type="button"
                    aria-label="Edit"
                    onClick={openEdit}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-canvas/80 text-muted-foreground hover:text-ink transition-colors"
                  >
                    <Pencil size={10} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={onDelete}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-canvas/80 text-muted-foreground hover:text-danger transition-colors"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
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
          </>
        )}
      </div>
    </div>
  );
}
