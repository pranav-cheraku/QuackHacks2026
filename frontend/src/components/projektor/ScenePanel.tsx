import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Image as ImageIcon,
  Lock,
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
import type {
  EdgeRelation,
  SceneRole,
  SceneStatus,
  SlideNode,
} from "@/lib/projektor-data";
import type { ContentNode } from "@/lib/ir";
import { editNode } from "@/lib/editApi";
import { getIntake } from "@/lib/intakeStore";
import { getThread, setThread, type ChatMessage } from "@/lib/chatStore";
import type { EditOp } from "@backend/landing-page/editSchema";

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
  // Agent-built content components land here: one ContentNode per accepted op,
  // already attached to the box via sourceRef. Added to the global contentPool.
  onCreateContent: (nodes: ContentNode[]) => void;
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
  onCreateContent,
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
        node ? (
          <ChatTab
            key={node.id}
            node={node}
            onCreateContent={onCreateContent}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
            Select a scene to chat about it.
          </div>
        )
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
  onDelete,
}: {
  node: SlideNode;
  parentRelation: EdgeRelation | null;
  hasParent: boolean;
  onChangeStatus: (id: string, s: SceneStatus) => void;
  onChangeRole: (id: string, r: SceneRole) => void;
  onChangeRelation: (toId: string, r: EdgeRelation) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const status = STATUS_OPTIONS.find((o) => o.value === node.status)!;
  const role = node.role ?? "claim";
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

const QUICK_PROMPTS = [
  "Add a supporting stat",
  "Tighten the body copy",
  "Add a relevant image",
];

const CN_W = 220;
const CN_GAP = 16;

// Badge label for a proposed content component, for the proposal card.
function opKindLabel(op: EditOp): string {
  if (op.kind === "text") return op.role ? op.role.toUpperCase() : "TEXT";
  if (op.kind === "image") return "IMAGE";
  return "CHART";
}

// One-line human description of a proposed content component, for the proposal card.
function opLine(op: EditOp): string {
  if (op.kind === "text") return op.text ?? "";
  if (op.kind === "image")
    return op.caption ? `${op.caption} (uploaded image)` : "(uploaded image)";
  const pts = (op.chartData ?? []).length;
  return `${op.chartTitle ?? "Chart"} — ${op.chartType ?? "bar"}, ${pts} point${pts === 1 ? "" : "s"}`;
}

// Build a ContentNode (ir) from one agent op, attached to `box` via sourceRef and
// positioned just below it on the canvas. Returns null if it can't be built — e.g.
// an image op whose imageRef doesn't match an upload, or a text op with no text.
function contentNodeFromOp(op: EditOp, box: SlideNode, seq: number): ContentNode | null {
  const id = `cp-agent-${box.id}-${Date.now()}-${seq}`;
  const graphPosition = {
    x: box.x + seq * (CN_W + CN_GAP),
    y: box.y + (box.height ?? 200) + 80,
  };
  if (op.kind === "text") {
    if (!op.text) return null;
    return {
      id,
      kind: "text",
      payload: { role: op.role ?? "claim", text: op.text },
      sourceRef: box.id,
      graphPosition,
    };
  }
  if (op.kind === "image") {
    const img = getIntake().images.find((i) => i.id === op.imageRef);
    if (!img) return null;
    return {
      id,
      kind: "image",
      payload: { url: img.url, caption: op.caption },
      sourceRef: box.id,
      graphPosition,
    };
  }
  if (op.kind === "data") {
    const data: Record<string, number> = {};
    (op.chartData ?? []).forEach((d) => {
      data[d.label] = d.value;
    });
    return {
      id,
      kind: "data",
      payload: { chart: { type: op.chartType ?? "bar", data, title: op.chartTitle } },
      sourceRef: box.id,
      graphPosition,
    };
  }
  return null;
}

// Reject if a promise doesn't settle within `ms`. This guarantees the chat's
// "thinking" state always clears — without it, a hung/rate-limited server call
// never settles, isThinking stays true, and the send guard silently blocks every
// future message (the chat appears completely dead, with no error).
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("[TIMEOUT] The AI took too long to respond.")), ms),
    ),
  ]);
}

// Turn a raw agent error into a short, honest chat message, so a failure is
// visible (and its cause clear) instead of hidden behind a fake proposal.
function friendlyEditError(reason: string): string {
  if (reason.includes("[GEMINI_KEY_MISSING]"))
    return "The AI isn't configured — no Gemini API key on the server.";
  if (
    reason.includes("[TIMEOUT]") ||
    reason.includes("[GEMINI_API_ERROR]") ||
    /429|rate|quota|RESOURCE_EXHAUSTED/i.test(reason)
  )
    return "The AI is busy or rate-limited right now — give it a moment and try again.";
  return "Couldn't reach the AI. Try again in a moment.";
}

function ChatTab({
  node,
  onCreateContent,
}: {
  node: SlideNode;
  onCreateContent: (nodes: ContentNode[]) => void;
}) {
  // Per-node thread: seed from the session store, persist on every change.
  const [messages, setMessages] = useState<ChatMessage[]>(() => getThread(node.id));
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThread(node.id, messages);
  }, [node.id, messages]);

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isThinking]);

  // Send an instruction to the edit agent. It returns a proposal (block ops),
  // appended as an agent message awaiting Accept/Discard. Falls back to a
  // deterministic mock proposal if the agent is unreachable.
  const send = async (text: string) => {
    const instruction = text.trim();
    if (!instruction || isThinking) return;
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, role: "user", content: instruction },
    ]);
    setDraft("");
    setIsThinking(true);
    try {
      // Time-box the call so a hung/rate-limited request can never wedge the chat.
      const res = await withTimeout(
        editNode({
          data: {
            instruction,
            node: {
              title: node.title,
              body: node.body,
              eyebrow: node.eyebrow,
              kind: node.kind,
            },
            availableImages: getIntake().images.map((i) => ({ id: i.id, name: i.name })),
          },
        }),
        30000,
      );
      setMessages((prev) => [
        ...prev,
        { id: `m-${Date.now()}`, role: "agent", content: res.summary, proposal: res, proposalStatus: "pending" },
      ]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn("[ChatTab] edit agent failed:", reason);
      setMessages((prev) => [
        ...prev,
        { id: `m-${Date.now()}`, role: "agent", content: friendlyEditError(reason) },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Accept → build a ContentNode per op and attach them all to this box; Discard →
  // just mark it. Side effects (onCreateContent) run HERE in the event handler —
  // never inside the setMessages updater, which must stay pure (StrictMode
  // double-invokes updaters, which would otherwise create the nodes twice).
  const decide = (msgId: string, accept: boolean) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !msg.proposal || msg.proposalStatus !== "pending") return;
    if (accept) {
      const built = msg.proposal.ops
        .map((op, i) => contentNodeFromOp(op, node, i))
        .filter((n): n is ContentNode => n !== null);
      if (built.length) onCreateContent(built);
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, proposalStatus: accept ? "accepted" : "discarded" } : m,
      ),
    );
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
              Ask the AI to edit the content of &ldquo;{node.title}&rdquo;. It
              proposes changes you accept or discard.
            </p>
            <div className="flex flex-col gap-2 w-full px-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
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
                  className="flex flex-col items-start gap-1.5"
                  style={{ animation: "slideUp 0.25s ease-out" }}
                >
                  <div className="max-w-[85%] bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[12px] leading-snug text-muted-foreground whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  {msg.proposal && msg.proposal.ops.length > 0 && (
                    <div className="w-full rounded-xl border border-border bg-canvas/60 p-2.5 space-y-2">
                      <div className="space-y-1">
                        {msg.proposal.ops.map((op, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-1.5 text-[11px] text-ink"
                          >
                            <span className="font-mono text-[9px] uppercase tracking-wider text-accent shrink-0 pt-0.5">
                              {opKindLabel(op)}
                            </span>
                            <span className="flex-1 break-words">{opLine(op)}</span>
                          </div>
                        ))}
                      </div>
                      {msg.proposalStatus === "pending" ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => decide(msg.id, true)}
                            className="flex-1 py-1.5 rounded-md text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: "var(--accent)" }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(msg.id, false)}
                            className="flex-1 py-1.5 rounded-md text-[11px] font-semibold text-muted-foreground border border-border hover:text-ink transition-colors"
                          >
                            Discard
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          {msg.proposalStatus === "accepted" ? "✓ Applied" : "Discarded"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
            {isThinking && (
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

      {/* Input */}
      <div className="border-t border-border p-2.5 shrink-0">
        <div className="border border-border rounded-lg px-3 py-2 bg-card flex items-center gap-1.5">
          <input
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
            placeholder="Ask the AI to edit this box…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <button
            type="button"
            onClick={() => send(draft)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:opacity-80 active:scale-90 transition-all shrink-0"
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
