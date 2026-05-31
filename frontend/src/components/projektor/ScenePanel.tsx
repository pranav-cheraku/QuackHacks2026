import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  BarChart3,
  ChevronDown,
  Hash,
  Heading,
  Heading2,
  Image as ImageIcon,
  List as ListIcon,
  Lock,
  Plus,
  Quote,
  Send,
  Sparkles,
  Unlock,
  Video,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ComponentType,
  EdgeRelation,
  SceneRole,
  SceneStatus,
  SlideNode,
} from "@/lib/projektor-data";

type Tab = "chat" | "inspect" | "argument";

interface Props {
  node: SlideNode | null;
  parentRelation: EdgeRelation | null; // null → this is a root (no parent)
  hasParent: boolean;
  onClose: () => void;
  onChangeStatus: (id: string, s: SceneStatus) => void;
  onChangeRole: (id: string, r: SceneRole) => void;
  onChangeRelation: (toId: string, r: EdgeRelation) => void;
  onToggleLock: (id: string) => void;
  onAddBlock: (id: string, type: ComponentType) => void;
  onRemoveBlock: (id: string, blockId: string) => void;
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

// "+ Add content" menu (spec): Text group + Media group.
const ADD_TEXT: { type: ComponentType; label: string }[] = [
  { type: "Header", label: "Header" },
  { type: "Subheader", label: "Subheader" },
  { type: "Body", label: "Body" },
  { type: "List", label: "Bullet list" },
  { type: "Stat", label: "Stat / number" },
  { type: "Quote", label: "Quote" },
];
const ADD_MEDIA: { type: ComponentType; label: string }[] = [
  { type: "Image", label: "Image" },
  { type: "Video", label: "Video" },
  { type: "Chart", label: "Chart" },
];

const BLOCK_ICON: Partial<Record<ComponentType, typeof Heading>> = {
  Header: Heading,
  Subheader: Heading2,
  Body: AlignLeft,
  List: ListIcon,
  Stat: Hash,
  Quote: Quote,
  Image: ImageIcon,
  Video: Video,
  Chart: BarChart3,
};

// Floating right panel: everything about the one selected scene. Lives inside
// the canvas viewport as an absolute sibling, so it doesn't pan with the canvas.
export function ScenePanel({
  node,
  parentRelation,
  hasParent,
  onClose,
  onChangeStatus,
  onChangeRole,
  onChangeRelation,
  onToggleLock,
  onAddBlock,
  onRemoveBlock,
}: Props) {
  const [tab, setTab] = useState<Tab>("inspect");

  return (
    <div
      className="absolute right-4 top-4 bottom-4 z-20 w-[320px] flex flex-col rounded-2xl border border-border bg-chrome shadow-[var(--sh-v)] overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {node ? `Scene ${String(node.index).padStart(2, "0")}` : "Scene"}
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
          {node ? node.title : "No scene selected"}
        </div>

        {/* Tabs */}
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
      </div>

      {/* Body */}
      {!node ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
          Select a scene to inspect it.
        </div>
      ) : tab === "chat" ? (
        <ChatTab title={node.title} />
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
}: {
  node: SlideNode;
  parentRelation: EdgeRelation | null;
  hasParent: boolean;
  onChangeStatus: (id: string, s: SceneStatus) => void;
  onChangeRole: (id: string, r: SceneRole) => void;
  onChangeRelation: (toId: string, r: EdgeRelation) => void;
  onToggleLock: (id: string) => void;
  onAddBlock: (id: string, type: ComponentType) => void;
  onRemoveBlock: (id: string, blockId: string) => void;
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

        {/* Content blocks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-ink">
              Content blocks
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-semibold text-accent hover:bg-accent-soft/60 transition-colors"
                >
                  <Plus size={12} /> Add content
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[176px] bg-chrome border-border"
              >
                <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Text
                </DropdownMenuLabel>
                {ADD_TEXT.map((o) => (
                  <AddRow
                    key={o.type}
                    type={o.type}
                    label={o.label}
                    onSelect={() => onAddBlock(node.id, o.type)}
                  />
                ))}
                <DropdownMenuSeparator className="bg-line-soft" />
                <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Media
                </DropdownMenuLabel>
                {ADD_MEDIA.map((o) => (
                  <AddRow
                    key={o.type}
                    type={o.type}
                    label={o.label}
                    onSelect={() => onAddBlock(node.id, o.type)}
                  />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
              No content yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {blocks.map((b) => {
                const Icon = BLOCK_ICON[b.type] ?? AlignLeft;
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
        </div>
      </div>

      {/* Footer: Generate scene */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <Sparkles size={14} /> Generate scene
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

function ChatTab({ title }: { title: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, role: "user", content: text },
    ]);
    setDraft("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
            <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent">
              <Sparkles size={18} />
            </div>
            <p className="text-[13px] text-muted-foreground leading-snug max-w-[200px]">
              Talk to the AI about &ldquo;{title}&rdquo; and the slides
              connected to it.
            </p>
          </div>
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-[12px] leading-snug text-white whitespace-pre-wrap"
                  style={{ background: "var(--accent-teal)" }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex">
                <div className="max-w-[85%] bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[12px] leading-snug text-muted-foreground whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ),
          )
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2.5 shrink-0">
        <div className="border border-border rounded-lg px-3 py-2 bg-card flex items-center gap-2">
          <input
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground"
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
            className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity shrink-0"
            style={{ background: "var(--accent-teal)" }}
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

function AddRow({
  type,
  label,
  onSelect,
}: {
  type: ComponentType;
  label: string;
  onSelect: () => void;
}) {
  const Icon = BLOCK_ICON[type] ?? AlignLeft;
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className="gap-2 text-[13px] cursor-pointer focus:bg-canvas focus:text-ink"
    >
      <Icon size={14} className="text-muted-foreground" />
      {label}
    </DropdownMenuItem>
  );
}
