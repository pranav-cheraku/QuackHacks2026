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
import { ADD_MEDIA, ADD_TEXT, blockIcon } from "@/lib/content-blocks";
import type { ComponentType, ContentBlock } from "@/lib/projektor-data";

type Draft = Omit<ContentBlock, "id">;

// Types whose content is plain text (everything except Image/Video/Chart).
const isTextType = (t: ComponentType) =>
  t !== "Image" && t !== "Video" && t !== "Chart";
// Longer text gets a textarea; short labels get a single line.
const MULTILINE = new Set<ComponentType>(["Body", "List", "Quote"]);

const labelOf = (t: ComponentType) =>
  [...ADD_TEXT, ...ADD_MEDIA].find((o) => o.type === t)?.label ?? t;

const baseInput =
  "px-2.5 py-1.5 rounded-lg border border-border bg-card text-[13px] text-ink outline-none focus:border-[color:var(--accent)] transition-colors";
const inputCls = `${baseInput} w-full`;

// "+ Add content" → a single popup: step 1 pick a type, step 2 fill its content.
// Shared by the Inspect panel and the content-graph screen so they stay in sync.
// `variant` styles the trigger: "block" = full-width dashed (inspector list),
// "pill" = a solid floating button (on the content-graph canvas).
export function AddContent({
  onAdd,
  variant = "block",
}: {
  onAdd: (block: Draft) => void;
  variant?: "block" | "pill";
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ComponentType | null>(null);
  const [text, setText] = useState("");
  const [img, setImg] = useState<{ src: string; name: string } | null>(null);
  const [url, setUrl] = useState("");
  const [chartTitle, setChartTitle] = useState("");
  const [rows, setRows] = useState<{ label: string; value: string }[]>([
    { label: "", value: "" },
    { label: "", value: "" },
  ]);

  const reset = () => {
    setType(null);
    setText("");
    setImg(null);
    setUrl("");
    setChartTitle("");
    setRows([
      { label: "", value: "" },
      { label: "", value: "" },
    ]);
  };
  const close = () => {
    setOpen(false);
    reset();
  };

  const canAdd =
    type === null
      ? false
      : type === "Image"
        ? !!img
        : type === "Video"
          ? url.trim().length > 0
          : type === "Chart"
            ? chartTitle.trim().length > 0
            : text.trim().length > 0;

  const submit = () => {
    if (!type || !canAdd) return;
    let block: Draft;
    if (type === "Image") {
      block = { type, label: img!.name || "Image", src: img!.src };
    } else if (type === "Video") {
      block = { type, label: url.trim(), url: url.trim() };
    } else if (type === "Chart") {
      block = {
        type,
        label: chartTitle.trim(),
        data: rows
          .filter((r) => r.label.trim())
          .map((r) => ({ label: r.label.trim(), value: Number(r.value) || 0 })),
      };
    } else {
      block = { type, label: text.trim(), text: text.trim() };
    }
    onAdd(block);
    close();
  };

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
            {type && (
              <button
                type="button"
                aria-label="Back to types"
                onClick={reset}
                className="text-muted-foreground hover:text-ink transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {type ? `Add ${labelOf(type)}` : "Add content"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1 — type picker */}
        {!type ? (
          <div className="space-y-3">
            <TypeGroup
              label="Text"
              items={ADD_TEXT}
              onPick={(t) => setType(t)}
            />
            <TypeGroup
              label="Media"
              items={ADD_MEDIA}
              onPick={(t) => setType(t)}
            />
          </div>
        ) : (
          /* Step 2 — content form */
          <div className="space-y-3">
            {isTextType(type) &&
              (MULTILINE.has(type) ? (
                <textarea
                  autoFocus
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    type === "List" ? "One item per line…" : "Enter text…"
                  }
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    type === "Stat" ? "e.g. +38% on-time" : "Enter text…"
                  }
                  className={inputCls}
                />
              ))}

            {type === "Image" && (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      setImg({ src: URL.createObjectURL(f), name: f.name });
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
                    <span className="text-[12px]">
                      Click to upload an image
                    </span>
                  </div>
                )}
              </label>
            )}

            {type === "Video" && (
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

            {type === "Chart" && (
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
                          setRows((rs) =>
                            rs.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="Label"
                        className={`${baseInput} flex-1 min-w-0`}
                      />
                      <input
                        type="number"
                        value={r.value}
                        onChange={(e) =>
                          setRows((rs) =>
                            rs.map((x, j) =>
                              j === i ? { ...x, value: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="Value"
                        className={`${baseInput} w-20 shrink-0`}
                      />
                      <button
                        type="button"
                        aria-label="Remove row"
                        onClick={() =>
                          setRows((rs) =>
                            rs.length > 1 ? rs.filter((_, j) => j !== i) : rs,
                          )
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
                  onClick={() =>
                    setRows((rs) => [...rs, { label: "", value: "" }])
                  }
                  className="flex items-center gap-1 text-[12px] font-medium text-accent hover:opacity-80 transition-opacity"
                >
                  <Plus size={12} /> Add row
                </button>
              </div>
            )}
          </div>
        )}

        {type && (
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
  items: { type: ComponentType; label: string }[];
  onPick: (t: ComponentType) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((o) => {
          const Icon = blockIcon(o.type);
          return (
            <button
              key={o.type}
              type="button"
              onClick={() => onPick(o.type)}
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
