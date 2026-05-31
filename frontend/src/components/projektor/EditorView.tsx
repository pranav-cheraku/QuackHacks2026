import { useState } from "react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  ImageIcon,
  Square,
  ChevronDown,
  Plus,
  Sparkles,
  CheckCircle2,
  Loader2,
  Paperclip,
  Mic,
  Send,
  LayoutTemplate,
  Layers,
  SlidersHorizontal,
  Grid3x3,
} from "lucide-react";
import { INITIAL_NODES } from "@/lib/projektor-data";
import { SlideThumb } from "./SlideThumb";
import { GridOverlay } from "./GridOverlay";

interface Props {
  startNodeId: string | null;
}

type RightTab = "agent" | "design" | "arrange";

export function EditorView({ startNodeId }: Props) {
  const [active, setActive] = useState(startNodeId ?? "n1");
  const [rightTab, setRightTab] = useState<RightTab>("agent");
  const [showGrid, setShowGrid] = useState(false);
  const node = INITIAL_NODES.find((n) => n.id === active) ?? INITIAL_NODES[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-chrome">
      {/* ── Formatting toolbar ── */}
      <div className="h-10 border-b border-border bg-chrome flex items-center px-3 gap-1 shrink-0 text-[12px]">
        <ToolBtn><Undo2 size={13} /></ToolBtn>
        <ToolBtn><Redo2 size={13} /></ToolBtn>
        <Sep />
        <Select label="Manrope" />
        <div className="flex items-center border border-border rounded h-7">
          <button className="px-1.5 text-muted-foreground hover:text-ink">−</button>
          <span className="px-2 text-[11px] font-mono border-x border-border">24</span>
          <button className="px-1.5 text-muted-foreground hover:text-ink">+</button>
        </div>
        <Sep />
        <ToolBtn><Bold size={12} /></ToolBtn>
        <ToolBtn><Italic size={12} /></ToolBtn>
        <ToolBtn><Underline size={12} /></ToolBtn>
        <div className="w-5 h-5 rounded border border-border mx-1 cursor-pointer" style={{ background: "var(--ink)" }} />
        <Sep />
        <ToolBtn><AlignLeft size={12} /></ToolBtn>
        <ToolBtn><AlignCenter size={12} /></ToolBtn>
        <ToolBtn><AlignRight size={12} /></ToolBtn>
        <Sep />
        <ToolBtn title="Text"><Type size={12} /></ToolBtn>
        <ToolBtn title="Image"><ImageIcon size={12} /></ToolBtn>
        <ToolBtn title="Shape"><Square size={12} /></ToolBtn>
        <ToolBtn title="Layout"><LayoutTemplate size={12} /></ToolBtn>
        <div className="ml-auto">
          <button
            title={showGrid ? "Hide grid" : "Show grid"}
            onClick={() => setShowGrid((v) => !v)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              showGrid
                ? "text-white"
                : "text-muted-foreground hover:text-ink"
            }`}
            style={showGrid ? { background: "var(--accent-teal)" } : undefined}
          >
            <Grid3x3 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Left slide strip ── */}
        <aside className="w-[180px] shrink-0 border-r border-border bg-chrome flex flex-col">
          <div className="flex-1 overflow-y-auto py-2">
            {INITIAL_NODES.map((n) => (
              <button
                key={n.id}
                onClick={() => setActive(n.id)}
                className={`w-full px-3 py-1.5 flex gap-2.5 items-start text-left transition-all ${
                  active === n.id
                    ? "bg-[color:var(--accent-soft)]"
                    : "hover:bg-canvas/50"
                }`}
              >
                {/* Slide number */}
                <span className="text-[10px] font-mono text-muted-foreground pt-1 w-4 shrink-0 text-right">
                  {n.index}
                </span>
                {/* Thumbnail — 16:9 ratio */}
                <div
                  className={`flex-1 rounded border overflow-hidden bg-white transition-all ${
                    active === n.id
                      ? "border-[color:var(--accent-teal)] shadow-[0_0_0_2px_var(--accent-soft)]"
                      : "border-border"
                  }`}
                  style={{ aspectRatio: "16/9" }}
                >
                  {n.state === "rendered" ? (
                    <SlideThumb node={n} />
                  ) : (
                    <div className="h-full w-full bg-canvas/40 flex items-center justify-center text-[8px] font-mono text-muted-foreground">
                      draft
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Add slide */}
          <div className="border-t border-border p-2.5">
            <button className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-ink border border-dashed border-border rounded hover:border-[color:var(--accent-teal)] hover:bg-canvas/40 transition-all">
              <Plus size={12} /> Add slide
            </button>
          </div>
        </aside>

        {/* ── Center canvas ── */}
        <div className="flex-1 flex items-center justify-center bg-canvas/60 overflow-auto p-8 min-w-0">
          <div
            className="bg-white rounded-sm shadow-[0_8px_40px_-12px_oklch(0.3_0.01_175/0.3)] relative overflow-hidden shrink-0"
            style={{ width: 928, height: 522 }}
          >
            {/* Grid overlay (toggle with the grid button in the toolbar) */}
            <GridOverlay visible={showGrid} />

            {/* Teal accent stripe */}
            <div
              className="absolute right-0 top-0 h-full w-12 flex items-center justify-center"
              style={{ background: "var(--accent-teal)" }}
            >
              <div
                className="text-white font-mono text-[10px] tracking-[0.4em] font-bold"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                PROJEKTOR
              </div>
            </div>

            {/* Slide content */}
            <div className="p-12 h-full flex flex-col">
              <div
                className="text-[12px] font-mono uppercase tracking-[0.25em] font-bold"
                style={{ color: "var(--accent-teal)" }}
              >
                Q3 · FY26
              </div>
              <div
                className="mt-10 text-[72px] leading-[0.95] font-extrabold text-ink tracking-tight"
                style={{ fontWeight: 800 }}
              >
                {node.title === "Title" ? "Strategy Review" : node.title}
              </div>
              <div className="mt-6 text-[18px] text-muted-foreground max-w-xl leading-snug">
                Aligning Q4 priorities across product, sales, and operations —
                what's working, what's next.
              </div>
              <div className="mt-auto flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                  style={{ background: "oklch(0.55 0.1 250)" }}
                >
                  AK
                </div>
                <div>
                  <div className="text-[13px] font-bold leading-tight">Avery Kim</div>
                  <div className="text-[11px] text-muted-foreground font-mono">Head of Strategy</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <aside className="w-[280px] shrink-0 border-l border-border bg-chrome flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-border shrink-0">
            {(
              [
                { id: "agent", label: "Agent", icon: Sparkles },
                { id: "design", label: "Design", icon: SlidersHorizontal },
                { id: "arrange", label: "Arrange", icon: Layers },
              ] as { id: RightTab; label: string; icon: React.FC<{ size: number }> }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
                  rightTab === id
                    ? "text-ink border-b-2 border-[color:var(--accent-teal)] -mb-px"
                    : "text-muted-foreground hover:text-ink"
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {rightTab === "agent" && <AgentPanel />}
            {rightTab === "design" && <DesignPanel />}
            {rightTab === "arrange" && <ArrangePanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Agent panel ── */
function AgentPanel() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* User message */}
        <div className="flex justify-end gap-2 items-start">
          <div
            className="max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-[11px] leading-snug text-white"
            style={{ background: "var(--accent-teal)" }}
          >
            Here's the brain-dump + our deck-data.csv. Make it investor-ready,
            5 minutes.
          </div>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5"
            style={{ background: "oklch(0.55 0.1 250)" }}
          >
            You
          </div>
        </div>

        {/* Agent checklist */}
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full bg-canvas border border-border flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={10} style={{ color: "var(--accent-teal)" }} />
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[11px] space-y-2">
            {[
              { done: true, text: "Brand extracted → persimmon + pine palette" },
              { done: true, text: "7 scenes laid out, 6 passed first render" },
              { done: true, text: "Scene 04 re-balanced (was crowded)" },
              { done: false, text: "Checking the argument…" },
            ].map(({ done, text }, i) => (
              <div key={i} className="flex items-start gap-2">
                {done ? (
                  <CheckCircle2 size={12} className="mt-px shrink-0" style={{ color: "var(--accent-teal)" }} />
                ) : (
                  <Loader2 size={12} className="mt-px shrink-0 animate-spin text-muted-foreground" />
                )}
                <span className={done ? "text-ink" : "text-muted-foreground"}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up */}
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full bg-canvas border border-border flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={10} style={{ color: "var(--accent-teal)" }} />
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
            Scene <strong className="text-ink">06</strong> makes a claim with no
            evidence, and you're running{" "}
            <strong className="text-ink">~7 min</strong> for a 5-min slot.
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-2.5 shrink-0">
        <div className="border border-border rounded-lg px-3 py-2 bg-card flex items-center">
          <input
            className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Ask the agent to refine the deck…"
          />
        </div>
        <div className="flex items-center justify-between mt-2 px-0.5">
          <div className="flex gap-0.5">
            {[Paperclip, Mic].map((Icon, i) => (
              <button key={i} className="w-7 h-7 flex items-center justify-center rounded hover:bg-canvas/60 text-muted-foreground hover:text-ink transition-colors">
                <Icon size={13} />
              </button>
            ))}
          </div>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity"
            style={{ background: "var(--accent-teal)" }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Design panel ── */
function DesignPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      <Section label="Typography">
        <Row label="Font">
          <Select label="Manrope" small />
        </Row>
        <Row label="Size">
          <div className="flex items-center border border-border rounded h-6">
            <button className="px-1.5 text-muted-foreground hover:text-ink text-[11px]">−</button>
            <span className="px-2 font-mono text-[10px] border-x border-border">72</span>
            <button className="px-1.5 text-muted-foreground hover:text-ink text-[11px]">+</button>
          </div>
        </Row>
        <Row label="Weight">
          <Select label="800 · ExtraBold" small />
        </Row>
        <Row label="Color">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-border" style={{ background: "var(--ink)" }} />
            <span className="font-mono text-[10px] text-muted-foreground">#1F2422</span>
          </div>
        </Row>
      </Section>

      <Section label="Background">
        <div className="grid grid-cols-5 gap-1.5">
          {["oklch(0.99 0 0)", "var(--ink)", "var(--accent-teal)", "oklch(0.65 0.12 30)", "oklch(0.55 0.1 250)"].map((c) => (
            <div key={c} className="h-7 rounded border border-border cursor-pointer hover:ring-2 ring-[color:var(--accent-teal)] transition-all" style={{ background: c }} />
          ))}
        </div>
      </Section>

      <Section label="Fill &amp; stroke">
        <Row label="Fill">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-border bg-white" />
            <span className="font-mono text-[10px] text-muted-foreground">#FFFFFF</span>
          </div>
        </Row>
        <Row label="Stroke">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-border bg-transparent" />
            <span className="font-mono text-[10px] text-muted-foreground">None</span>
          </div>
        </Row>
        <Row label="Opacity">
          <span className="font-mono text-[10px]">100%</span>
        </Row>
      </Section>
    </div>
  );
}

/* ── Arrange panel ── */
function ArrangePanel() {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
      <Section label="Position">
        <div className="grid grid-cols-2 gap-2">
          {[["X", "0"], ["Y", "0"]].map(([k, v]) => (
            <div key={k}>
              <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">{k}</div>
              <input defaultValue={v} className="w-full px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]" />
            </div>
          ))}
        </div>
      </Section>

      <Section label="Size">
        <div className="grid grid-cols-2 gap-2">
          {[["W", "928"], ["H", "522"]].map(([k, v]) => (
            <div key={k}>
              <div className="text-[9px] font-mono uppercase text-muted-foreground mb-1">{k}</div>
              <input defaultValue={v} className="w-full px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]" />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <div className="w-4 h-4 rounded border border-border flex items-center justify-center bg-[color:var(--accent-teal)]">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-muted-foreground">Lock aspect ratio</span>
        </label>
      </Section>

      <Section label="Rotation">
        <Row label="Angle">
          <div className="flex items-center gap-1.5">
            <input defaultValue="0" className="w-16 px-2 py-1 border border-border rounded text-[11px] bg-card text-ink outline-none focus:border-[color:var(--accent-teal)]" />
            <span className="text-muted-foreground">°</span>
          </div>
        </Row>
      </Section>

      <Section label="Layer order">
        <div className="flex gap-1.5">
          {["Bring forward", "Send back"].map((label) => (
            <button key={label} className="flex-1 py-1 text-[10px] font-medium border border-border rounded hover:bg-canvas/50 transition-colors">
              {label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ── Small shared components ── */
function ToolBtn({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button title={title} className="w-7 h-7 flex items-center justify-center rounded hover:bg-canvas/60 text-ink transition-colors">
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

function Select({ label, small }: { label: string; small?: boolean }) {
  return (
    <button className={`flex items-center gap-1 border border-border rounded hover:bg-canvas/40 transition-colors ${small ? "px-1.5 h-6 text-[10px]" : "px-2 h-7 text-[11px]"}`}>
      {label} <ChevronDown size={small ? 9 : 11} />
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// Required for icon type in tab bar
import type React from "react";
