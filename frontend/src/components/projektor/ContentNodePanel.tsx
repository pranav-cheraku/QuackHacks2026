import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { ContentNode, TextPayload, ImagePayload } from "@/lib/ir";

interface Props {
  node: ContentNode;
  onClose: () => void;
  onChange: (updated: ContentNode) => void;
  onDelete: () => void;
}

const ROLES: { value: TextPayload["role"]; label: string }[] = [
  { value: "claim",    label: "Claim" },
  { value: "evidence", label: "Evidence" },
  { value: "aside",    label: "Aside" },
];

export function ContentNodePanel({ node, onClose, onChange, onDelete }: Props) {
  const textPayload = node.kind === "text" ? (node.payload as TextPayload) : null;
  const imagePayload = node.kind === "image" ? (node.payload as ImagePayload) : null;

  const [text, setText] = useState(textPayload?.text ?? "");
  const [role, setRole] = useState<TextPayload["role"]>(textPayload?.role ?? "claim");
  const [url, setUrl] = useState(imagePayload?.url ?? "");
  const [caption, setCaption] = useState(imagePayload?.caption ?? "");

  // Sync local state when a different node is selected
  useEffect(() => {
    if (node.kind === "text") {
      const p = node.payload as TextPayload;
      setText(p.text);
      setRole(p.role);
    } else {
      const p = node.payload as ImagePayload;
      setUrl(p.url);
      setCaption(p.caption ?? "");
    }
  }, [node.id, node.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitText = (nextText: string) => {
    if (node.kind !== "text") return;
    onChange({ ...node, payload: { role, text: nextText } });
  };

  const commitRole = (nextRole: TextPayload["role"]) => {
    setRole(nextRole);
    if (node.kind !== "text") return;
    onChange({ ...node, payload: { role: nextRole, text } });
  };

  const commitUrl = (nextUrl: string) => {
    if (node.kind !== "image") return;
    const cap = caption.trim();
    onChange({ ...node, kind: "image", payload: cap ? { url: nextUrl, caption: cap } : { url: nextUrl } });
  };

  const commitCaption = (nextCaption: string) => {
    if (node.kind !== "image") return;
    onChange({ ...node, kind: "image", payload: nextCaption.trim() ? { url, caption: nextCaption.trim() } : { url } });
  };

  const currentRoleLabel = ROLES.find((r) => r.value === role)?.label ?? "Claim";

  return (
    <div
      className="absolute right-4 top-4 bottom-4 z-20 w-[320px] flex flex-col rounded-2xl border border-border bg-chrome shadow-[var(--sh-v)] overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {node.kind === "text" ? "Content" : "Image"}
          </span>
          <button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-ink transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="mt-1 font-serif text-[20px] leading-[1.15] text-ink line-clamp-2">
          {textPayload?.text
            ? textPayload.text.slice(0, 60) + (textPayload.text.length > 60 ? "…" : "")
            : imagePayload?.caption ?? "Untitled"}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">

        {/* Role (text nodes only) */}
        {node.kind === "text" && (
          <Field label="Type">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-medium text-ink hover:bg-canvas/70 transition-colors"
                >
                  {currentRoleLabel}
                  <ChevronDown size={13} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px] bg-chrome border-border">
                {ROLES.map((r) => (
                  <DropdownMenuItem
                    key={r.value}
                    onSelect={() => commitRole(r.value)}
                    className="gap-1.5 text-[13px] cursor-pointer focus:bg-canvas focus:text-ink"
                  >
                    {r.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Field>
        )}

        <div className="h-px bg-line-soft" />

        {/* Text content */}
        {node.kind === "text" && (
          <div className="space-y-1.5">
            <span className="text-[12px] text-muted-foreground">Content</span>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => commitText(text)}
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-canvas text-[13px] text-ink leading-snug outline-none focus:border-[color:var(--accent)] transition-colors resize-none"
            />
          </div>
        )}

        {/* Image content */}
        {node.kind === "image" && (
          <div className="space-y-3">
            {url && (
              <img
                src={url}
                alt={caption || ""}
                className="w-full h-32 object-cover rounded-lg border border-border"
              />
            )}
            <div className="space-y-1.5">
              <span className="text-[12px] text-muted-foreground">URL</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => commitUrl(url)}
                placeholder="https://…"
                className="w-full px-2.5 py-2 rounded-lg border border-border bg-canvas text-[13px] text-ink outline-none focus:border-[color:var(--accent)] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[12px] text-muted-foreground">Caption</span>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onBlur={() => commitCaption(caption)}
                placeholder="Optional caption…"
                className="w-full px-2.5 py-2 rounded-lg border border-border bg-canvas text-[13px] text-ink outline-none focus:border-[color:var(--accent)] transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer — delete */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <button
          type="button"
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-danger border border-danger/30 hover:bg-danger/8 transition-colors"
        >
          <Trash2 size={14} /> Delete content node
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[28px]">
      <span className="text-[12px] text-muted-foreground shrink-0">{label}</span>
      {children}
    </div>
  );
}
