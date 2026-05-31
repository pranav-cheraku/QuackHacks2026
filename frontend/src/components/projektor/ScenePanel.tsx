import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddContent } from "./AddContent";
import { blockIcon } from "@/lib/content-blocks";
import type {
  ContentBlock,
  EdgeRelation,
  SceneRole,
  SceneStatus,
  SlideNode,
} from "@/lib/projektor-data";

type Tab = "chat" | "inspect" | "argument";

interface Props {
  node: SlideNode | null;
  selectedCount: number;
  parentRelation: EdgeRelation | null; // null → this is a root (no parent)
  hasParent: boolean;
  onClose: () => void;
  onChangeStatus: (id: string, s: SceneStatus) => void;
  onChangeRole: (id: string, r: SceneRole) => void;
  onChangeRelation: (toId: string, r: EdgeRelation) => void;
  onToggleLock: (id: string) => void;
  onAddBlock: (id: string, block: Omit<ContentBlock, "id">) => void;
  onRemoveBlock: (id: string, blockId: string) => void;
  onOpenContent: (id: string) => void;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  onReconsider: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: { value: SceneStatus; label: string; dot: string }[] = [
  { value: "draft", label: "Draft", dot: "var(--danger)" },
  { value: "in-review", label: "In Review", dot: "var(--warn)" },
  { value: "final", label: "Final", dot: "var(--ok)" },
];

const ROLE_OPTIONS: { value: SceneRole; label: string }[] = [
  { value: "claim", label: "Claim" },
  { value: "evidence", label: "Evidence" },
  { value: "data", label: "Data" },
  { value: "title", label: "Title" },
];

const RELATION_OPTIONS: { value: EdgeRelation; label: string }[] = [
  { value: "supports", label: "Supports" },
  { value: "contrasts", label: "Contrasts" },
  { value: "sequence", label: "Sequence" },
];

// Floating right panel: everything about the one selected scene. Lives inside
// the canvas viewport as an absolute sibling, so it doesn't pan with the canvas.
export function ScenePanel({
  node,
  selectedCount,
  parentRelation,
  hasParent,
  onClose,
  onChangeStatus,
  onChangeRole,
  onChangeRelation,
  onToggleLock,
  onAddBlock,
  onRemoveBlock,
  onOpenContent,
  onAccept,
  onDiscard,
  onReconsider,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<Tab>("inspect");
  const isGhost = Boolean(node?.ghost);

  return (
    <div
      className="absolute right-4 top-4 bottom-4 z-20 w-[320px] flex flex-col rounded-2xl border border-border bg-chrome shadow-[var(--sh-v)] overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider"
            style={
              isGhost
                ? { color: "var(--accent)", fontWeight: 600 }
                : { color: "var(--muted-foreground)" }
            }
          >
            {isGhost && <Sparkles size={11} />}
            {!node
              ? "Scene"
              : isGhost
                ? node.discarded
                  ? "Discarded"
                  : "Suggested"
                : `Scene ${String(node.index).padStart(2, "0")}`}
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
        <div className="mt-1 font-serif text-[20px] leading-[1.15] text-ink truncate">
          {selectedCount > 1
            ? "Multiple scenes selected"
            : node
              ? node.title
              : "Your presentation"}
        </div>

        {/* Tabs (committed scenes only — a ghost isn't editable yet) */}
        {node && !isGhost && (
          <div className="mt-3 flex items-center gap-1 p-0.5 rounded-lg bg-canvas">
            {(
              [
                ["chat", "Chat"],
                ["inspect", "Inspect"],
                ["argument", "Argument"],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex-1 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors ${
                  tab === value
                    ? "bg-chrome text-ink shadow-[0_1px_3px_-1px_rgba(40,30,20,0.18)]"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {tab === "chat" ? (
        <ChatTab
          title={node?.title ?? "your presentation"}
          selectedCount={selectedCount}
        />
      ) : !node ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
          Select a scene to inspect it.
        </div>
      ) : isGhost ? (
        <GhostTab
          node={node}
          onAccept={onAccept}
          onDiscard={onDiscard}
          onReconsider={onReconsider}
          onDelete={onDelete}
        />
      ) : tab === "inspect" ? (
        <InspectTab
          node={node}
          parentRelation={parentRelation}
          hasParent={hasParent}
          onChangeStatus={onChangeStatus}
          onChangeRole={onChangeRole}
          onChangeRelation={onChangeRelation}
          onToggleLock={onToggleLock}
          onAddBlock={onAddBlock}
          onRemoveBlock={onRemoveBlock}
          onOpenContent={onOpenContent}
          onDelete={onDelete}
        />
      ) : (
        <StubTab tab={tab} title={node.title} />
      )}
    </div>
  );
}

function InspectTab({
  node,
  parentRelation,
  hasParent,
  onChangeStatus,
  onChangeRole,
  onChangeRelation,
  onToggleLock,
  onAddBlock,
  onRemoveBlock,
  onOpenContent,
  onDelete,
}: {
  node: SlideNode;
  parentRelation: EdgeRelation | null;
  hasParent: boolean;
  onChangeStatus: (id: string, s: SceneStatus) => void;
  onChangeRole: (id: string, r: SceneRole) => void;
  onChangeRelation: (toId: string, r: EdgeRelation) => void;
  onToggleLock: (id: string) => void;
  onAddBlock: (id: string, block: Omit<ContentBlock, "id">) => void;
  onRemoveBlock: (id: string, blockId: string) => void;
  onOpenContent: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const status = STATUS_OPTIONS.find((o) => o.value === node.status)!;
  const role = node.role ?? "claim";
  const blocks = node.blocks ?? [];
  // Static placeholders (computed deterministically so scenes differ a little).
  const designScore = 72 + ((node.index * 7) % 24);
  const claimFlags =
    node.kind === "title" ? "No claims to check" : "2 of 3 claims supported";
  const estTime = 18 + ((node.index * 6) % 22);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">
        {/* Status */}
        <Field label="Status">
          <Select
            valueLabel={
              <span className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: status.dot }}
                />
                {status.label}
              </span>
            }
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuRow
                key={o.value}
                onSelect={() => onChangeStatus(node.id, o.value)}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: o.dot }}
                />
                {o.label}
              </MenuRow>
            ))}
          </Select>
        </Field>

        {/* Role */}
        <Field label="Role">
          <Select
            valueLabel={
              ROLE_OPTIONS.find((o) => o.value === role)?.label ?? "—"
            }
          >
            {ROLE_OPTIONS.map((o) => (
              <MenuRow
                key={o.value}
                onSelect={() => onChangeRole(node.id, o.value)}
              >
                {o.label}
              </MenuRow>
            ))}
          </Select>
        </Field>

        {/* Relation to parent */}
        <Field label="Relation to parent">
          {hasParent ? (
            <Select
              valueLabel={
                RELATION_OPTIONS.find((o) => o.value === parentRelation)
                  ?.label ?? "—"
              }
            >
              {RELATION_OPTIONS.map((o) => (
                <MenuRow
                  key={o.value}
                  onSelect={() => onChangeRelation(node.id, o.value)}
                >
                  {o.label}
                </MenuRow>
              ))}
            </Select>
          ) : (
            <span className="text-[13px] text-faint">— root</span>
          )}
        </Field>

        <div className="h-px bg-line-soft" />

        {/* Scores */}
        <Field label="Scores">
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <span className="font-mono tabular-nums">{designScore}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                design
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {claimFlags}
            </span>
          </div>
        </Field>

        {/* Est. time */}
        <Field label="Est. time">
          <span className="text-[13px] font-mono tabular-nums text-ink">
            +{estTime}s
          </span>
        </Field>

        {/* Lock */}
        <Field label="Lock">
          <button
            type="button"
            onClick={() => onToggleLock(node.id)}
            aria-pressed={node.locked ?? false}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-semibold transition-colors ${
              node.locked
                ? "text-accent"
                : "text-muted-foreground hover:text-ink"
            }`}
            style={
              node.locked ? { background: "var(--accent-soft)" } : undefined
            }
          >
            {node.locked ? <Lock size={12} /> : <Unlock size={12} />}
            {node.locked ? "Locked" : "Unlocked"}
          </button>
        </Field>

        <div className="h-px bg-line-soft" />

        {/* Content blocks — the header is a button that opens the scene's
            content graph; below it, the list and the Add-content popup. */}
        <div>
          <button
            type="button"
            onClick={() => onOpenContent(node.id)}
            className="w-full mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-surface-2 hover:border-[color:var(--accent)] hover:bg-canvas/60 transition-colors"
          >
            <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
              <LayoutGrid size={14} className="text-muted-foreground" />
              Content blocks
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-[11px] font-mono">{blocks.length}</span>
              <ChevronRight size={14} />
            </span>
          </button>

          {blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
              No content yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {blocks.map((b) => {
                const Icon = blockIcon(b.type);
                return (
                  <div
                    key={b.id}
                    className="group flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-surface-2"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-canvas text-ink-soft shrink-0">
                      <Icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {b.type}
                      </span>
                      <span className="block text-[12.5px] text-ink truncate">
                        {b.label}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${b.type}`}
                      onClick={() => onRemoveBlock(node.id, b.id)}
                      className="text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2">
            <AddContent onAdd={(block) => onAddBlock(node.id, block)} />
          </div>
        </div>
      </div>

      {/* Footer: Generate scene + permanent delete */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <Sparkles size={14} /> Generate scene
        </button>
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-danger transition-colors"
        >
          <Trash2 size={13} /> Delete scene permanently
        </button>
      </div>
    </div>
  );
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
}

const AUTO_RESPONSES = [
  "Based on the current slide structure, I'd suggest reinforcing the key claim with additional supporting evidence on the slide that follows.",
  "This slide looks strong. Consider tightening the headline to focus on the single most important insight for the audience.",
  "The argument flow could be improved by moving the data slide before this one to establish context first.",
  "Nice structure overall. You might want to add a transition statement that bridges this slide's conclusion to the next claim.",
  "The visual hierarchy could be improved here — try leading with the key stat rather than the body copy to hook the audience faster.",
];
let autoIdx = 0;

const QUICK_PROMPTS = [
  "Assess the slide deck flow",
  "Improve this slide",
  "Suggest supporting evidence",
];

interface AttachedImage {
  file: File;
  width: number;
  height: number;
  objectUrl: string;
}

function ChatTab({
  title,
  selectedCount,
}: {
  title: string;
  selectedCount: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<AttachedImage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Revoke object URL when attachment changes to avoid memory leaks
  useEffect(() => {
    return () => {
      if (attachment) URL.revokeObjectURL(attachment.objectUrl);
    };
  }, [attachment]);

  const submitText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    const content = [
      attachment
        ? `[Image: ${attachment.file.name} ${attachment.width}×${attachment.height}]`
        : "",
      trimmed,
    ]
      .filter(Boolean)
      .join("\n");
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, role: "user", content },
    ]);
    setDraft("");
    if (attachment) {
      URL.revokeObjectURL(attachment.objectUrl);
      setAttachment(null);
    }
    setIsTyping(true);
    const response = AUTO_RESPONSES[autoIdx % AUTO_RESPONSES.length];
    autoIdx += 1;
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}`, role: "agent", content: response },
      ]);
    }, 1400);
  };

  const submit = () => {
    if (!draft.trim() && !attachment) return;
    setSending(true);
    setTimeout(() => setSending(false), 350);
    submitText(draft);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setAttachment({
        file,
        width: img.naturalWidth,
        height: img.naturalHeight,
        objectUrl: url,
      });
    };
    img.src = url;
    e.target.value = "";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
        @keyframes sendPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.82); }
          70%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
      `}</style>
      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-10">
            <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent">
              <Sparkles size={18} />
            </div>
            <p className="text-[13px] text-muted-foreground leading-snug max-w-[200px]">
              Talk to the AI about &ldquo;{title}&rdquo; and the slides
              connected to it.
            </p>
            <div className="flex flex-col gap-2 w-full px-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitText(prompt)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-[12px] text-muted-foreground hover:text-ink hover:bg-canvas/60 transition-colors text-left"
                >
                  <span className="text-muted-foreground">↪</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div
                  key={msg.id}
                  className="flex justify-end"
                  style={{ animation: "slideUp 0.25s ease-out" }}
                >
                  <div
                    className="max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-[12px] leading-snug text-white whitespace-pre-wrap"
                    style={{ background: "var(--accent-teal)" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div
                  key={msg.id}
                  className="flex"
                  style={{ animation: "slideUp 0.25s ease-out" }}
                >
                  <div className="max-w-[85%] bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[12px] leading-snug text-muted-foreground whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ),
            )}
            {isTyping && (
              <div
                className="flex"
                style={{ animation: "slideUp 0.2s ease-out" }}
              >
                <div className="bg-card border border-border rounded-xl rounded-tl-sm px-3 py-3 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                      style={{
                        animation: "dotBounce 1.1s ease-in-out infinite",
                        animationDelay: `${i * 0.18}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Slides context badge */}
      <div className="px-3 pb-1 shrink-0 flex">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-canvas border border-border text-[10px] text-muted-foreground select-none">
          <ImageIcon size={10} />
          {selectedCount} slide{selectedCount !== 1 ? "s" : ""} selected
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-2.5 shrink-0 space-y-2">
        {/* Image attachment preview */}
        {attachment && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-canvas border border-border text-[11px] text-muted-foreground max-w-full overflow-hidden">
              <ImageIcon size={11} className="shrink-0 text-accent" />
              <span className="truncate font-medium text-ink">
                {attachment.file.name}
              </span>
              <span className="shrink-0 text-faint">
                {attachment.width}×{attachment.height}
              </span>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(attachment.objectUrl);
                  setAttachment(null);
                }}
                className="ml-0.5 shrink-0 text-muted-foreground hover:text-ink transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg px-2 py-2 bg-card flex items-center gap-1.5">
          {/* + button — opens image upload dropup */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-ink hover:bg-canvas/60 transition-colors shrink-0"
              >
                <Plus size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="min-w-40 bg-chrome border-border"
            >
              <DropdownMenuItem
                onSelect={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-[13px] cursor-pointer"
              >
                <ImageIcon size={13} />
                Add image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <input
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
            placeholder="Ask about this scene…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="button"
            onClick={submit}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all shrink-0"
            style={{
              background: "var(--accent-teal)",
              animation: sending ? "sendPop 0.35s ease-out" : undefined,
            }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StubTab({ tab, title }: { tab: Tab; title: string }) {
  const copy =
    tab === "chat"
      ? `Talk to the AI about “${title}” and the slides connected to it.`
      : `Claims and evidence checks for “${title}” will appear here.`;
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent">
        <Sparkles size={18} />
      </div>
      <p className="text-[13px] text-muted-foreground leading-snug">{copy}</p>
      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
        Coming soon
      </span>
    </div>
  );
}

// Ghost (suggested branch) view: rationale + Accept / Discard, mirroring the
// card actions. Discarded ghosts can be reconsidered (revisitable, not deleted).
function GhostTab({
  node,
  onAccept,
  onDiscard,
  onReconsider,
  onDelete,
}: {
  node: SlideNode;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  onReconsider: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const discarded = Boolean(node.discarded);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-[13px] leading-relaxed text-ink">
          {node.rationale ?? "An AI-suggested next slide for your deck."}
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {discarded
            ? "You set this branch aside. It stays here, dimmed, so you can revisit the road not taken."
            : "Accept to add it to your deck, or discard to set it aside — discarded branches stay revisitable."}
        </p>
      </div>
      <div className="shrink-0 px-4 py-3 border-t border-border">
        {discarded ? (
          <button
            type="button"
            onClick={() => onReconsider(node.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-ink border border-border bg-chrome hover:bg-canvas/60 transition-colors"
          >
            <RotateCcw size={14} /> Reconsider
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDiscard(node.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-ink-soft border border-border bg-chrome hover:text-ink transition-colors"
            >
              <X size={14} /> Discard
            </button>
            <button
              type="button"
              onClick={() => onAccept(node.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <Check size={14} strokeWidth={2.5} /> Accept
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-danger transition-colors"
        >
          <Trash2 size={13} /> Delete permanently
        </button>
      </div>
    </div>
  );
}

// --- small building blocks --------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[28px]">
      <span className="text-[12px] text-muted-foreground shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}

// A label-on-the-right dropdown trigger styled as a quiet select.
function Select({
  valueLabel,
  children,
}: {
  valueLabel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-medium text-ink hover:bg-canvas/70 transition-colors"
        >
          {valueLabel}
          <ChevronDown size={13} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px] bg-chrome border-border"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuRow({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className="gap-1.5 text-[13px] cursor-pointer focus:bg-canvas focus:text-ink"
    >
      {children}
    </DropdownMenuItem>
  );
}
