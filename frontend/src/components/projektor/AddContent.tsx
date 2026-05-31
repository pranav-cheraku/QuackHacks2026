import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlignLeft, BarChart3, Hash, Heading, Heading2,
  Image as ImageIcon, List as ListIcon, Quote, Video,
  type LucideIcon,
} from "lucide-react";
import type { ContentNode, TextPayload } from "@/lib/ir";

// ContentNode without id/graphPosition — caller supplies those.
type Draft = Omit<ContentNode, "id" | "graphPosition" | "sourceRef" | "assignedSceneId">;

type TextRole = TextPayload["role"];

const TEXT_OPTIONS: { role: TextRole; label: string; icon: LucideIcon }[] = [
  { role: "header",    label: "Header",       icon: Heading   },
  { role: "subheader", label: "Subheader",    icon: Heading2  },
  { role: "body",      label: "Body",         icon: AlignLeft },
  { role: "bullet",    label: "Bullet list",  icon: ListIcon  },
  { role: "stat",      label: "Stat / number",icon: Hash      },
  { role: "quote",     label: "Quote",        icon: Quote     },
];

type MediaKind = "image" | "video" | "data";
const MEDIA_OPTIONS: { kind: MediaKind; label: string; icon: LucideIcon }[] = [
  { kind: "image", label: "Image",  icon: ImageIcon  },
  { kind: "video", label: "Video",  icon: Video      },
  { kind: "data",  label: "Chart",  icon: BarChart3  },
];

type PickedType =
  | { tag: "text"; role: TextRole }
  | { tag: "media"; kind: MediaKind };

const baseInput =
  "px-2.5 py-1.5 rounded-lg border border-border bg-card text-[13px] text-ink outline-none focus:border-[color:var(--accent)] transition-colors";
const inputCls = `${baseInput} w-full`;

const MULTILINE_ROLES = new Set<TextRole>(["body", "bullet", "quote"]);

export function AddContent({
  onAdd,
  variant = "block",
}: {
  onAdd: (draft: Draft) => void;
  variant?: "block" | "pill";
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<PickedType | null>(null);
  const [text, setText] = useState("");
  const [img, setImg] = useState<{ src: string; name: string } | null>(null);
  const [url, setUrl] = useState("");
  const [chartTitle, setChartTitle] = useState("");
  const [rows, setRows] = useState<{ label: string; value: string }[]>([
    { label: "", value: "" },
    { label: "", value: "" },
  ]);

  const reset = () => {
    setPicked(null);
    setText("");
    setImg(null);
    setUrl("");
    setChartTitle("");
    setRows([{ label: "", value: "" }, { label: "", value: "" }]);
  };
  const close = () => { setOpen(false); reset(); };

  const canAdd = !picked
    ? false
    : picked.tag === "media" && picked.kind === "image"
      ? !!img
      : picked.tag === "media" && picked.kind === "video"
        ? url.trim().length > 0
        : picked.tag === "media" && picked.kind === "data"
          ? chartTitle.trim().length > 0
          : text.trim().length > 0;

  const submit = () => {
    if (!picked || !canAdd) return;
    let draft: Draft;
    if (picked.tag === "media" && picked.kind === "image") {
      draft = { kind: "image", payload: { url: img!.src, caption: img!.name } };
    } else if (picked.tag === "media" && picked.kind === "video") {
      draft = { kind: "video", payload: { url: url.trim() } };
    } else if (picked.tag === "media" && picked.kind === "data") {
      draft = {
        kind: "data",
        payload: {
          chart: {
            type: "bar",
            data: { values: rows.filter((r) => r.label.trim()).map((r) => ({ label: r.label.trim(), value: Number(r.value) || 0 })) },
            title: chartTitle.trim(),
          },
        },
      };
    } else if (picked.tag === "text") {
      const t = text.trim();
      draft = { kind: "text", payload: { role: picked.role, text: t } };
    } else {
      return;
    }
    onAdd(draft);
    close();
  };

  const pickedLabel = picked
    ? picked.tag === "text"
      ? TEXT_OPTIONS.find((o) => o.role === picked.role)?.label ?? picked.role
      : MEDIA_OPTIONS.find((o) => o.kind === picked.kind)?.label ?? picked.kind
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        {variant === "pill" ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold text-white shadow-[var(--sh-v)] transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={14} /> Add content
          </button>
        ) : (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-[12.5px] font-medium text-muted-foreground hover:text-ink hover:border-[color:var(--accent)] hover:bg-canvas/40 transition-colors"
          >
            <Plus size={13} /> Add content
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        className="max-w-md bg-chrome border-border text-ink"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            {picked && (
              <button
                type="button"
                aria-label="Back to types"
                onClick={reset}
                className="text-muted-foreground hover:text-ink transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {picked ? `Add ${pickedLabel}` : "Add content"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1 — type picker */}
        {!picked ? (
          <div className="space-y-3">
            <TypeGroup
              label="Text"
              items={TEXT_OPTIONS.map((o) => ({ key: o.role, label: o.label, icon: o.icon }))}
              onPick={(key) => setPicked({ tag: "text", role: key as TextRole })}
            />
            <TypeGroup
              label="Media"
              items={MEDIA_OPTIONS.map((o) => ({ key: o.kind, label: o.label, icon: o.icon }))}
              onPick={(key) => setPicked({ tag: "media", kind: key as MediaKind })}
            />
          </div>
        ) : (
          /* Step 2 — content form */
          <div className="space-y-3">
            {picked.tag === "text" &&
              (MULTILINE_ROLES.has(picked.role) ? (
                <textarea
                  autoFocus
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={picked.role === "bullet" ? "One item per line…" : "Enter text…"}
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={picked.role === "stat" ? "e.g. +38% on-time" : "Enter text…"}
                  className={inputCls}
                />
              ))}

            {picked.tag === "media" && picked.kind === "image" && (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setImg({ src: URL.createObjectURL(f), name: f.name });
                  }}
                />
                {img ? (
                  <div className="rounded-lg border border-border overflow-hidden bg-canvas">
                    <img
                      src={img.src}
                      alt={img.name}
                      className="w-full max-h-44 object-contain bg-canvas"
                    />
                    <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground truncate border-t border-border">
                      {img.name} — click to replace
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed border-border text-muted-foreground hover:border-[color:var(--accent)] hover:text-ink transition-colors">
                    <Upload size={20} />
                    <span className="text-[12px]">Click to upload an image</span>
                  </div>
                )}
              </label>
            )}

            {picked.tag === "media" && picked.kind === "video" && (
              <div className="space-y-1.5">
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a YouTube link…"
                  className={inputCls}
                />
                <p className="text-[11px] text-muted-foreground">
                  e.g. https://www.youtube.com/watch?v=…
                </p>
              </div>
            )}

            {picked.tag === "media" && picked.kind === "data" && (
              <div className="space-y-2.5">
                <input
                  autoFocus
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  placeholder="Chart title…"
                  className={inputCls}
                />
                <div className="space-y-1.5">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={r.label}
                        onChange={(e) =>
                          setRows((rs) => rs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))
                        }
                        placeholder="Label"
                        className={`${baseInput} flex-1 min-w-0`}
                      />
                      <input
                        type="number"
                        value={r.value}
                        onChange={(e) =>
                          setRows((rs) => rs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))
                        }
                        placeholder="Value"
                        className={`${baseInput} w-20 shrink-0`}
                      />
                      <button
                        type="button"
                        aria-label="Remove row"
                        onClick={() =>
                          setRows((rs) => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs)
                        }
                        className="text-faint hover:text-danger transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRows((rs) => [...rs, { label: "", value: "" }])}
                  className="flex items-center gap-1 text-[12px] font-medium text-accent hover:opacity-80 transition-opacity"
                >
                  <Plus size={12} /> Add row
                </button>
              </div>
            )}
          </div>
        )}

        {picked && (
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={close}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-ink border border-border bg-chrome hover:bg-canvas/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canAdd}
              onClick={submit}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-default"
              style={{ background: "var(--accent)" }}
            >
              Add
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TypeGroup({
  label,
  items,
  onPick,
}: {
  label: string;
  items: { key: string; label: string; icon: LucideIcon }[];
  onPick: (key: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onPick(o.key)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-card text-[13px] text-ink hover:border-[color:var(--accent)] hover:bg-canvas/50 transition-colors"
            >
              <Icon size={15} className="text-muted-foreground shrink-0" />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
