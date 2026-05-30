import { useState } from "react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Image as ImageIcon,
  Square,
  Layers,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { INITIAL_NODES } from "@/lib/projektor-data";
import { SlideThumb } from "./SlideThumb";

interface Props {
  startNodeId: string | null;
}

export function EditorView({ startNodeId }: Props) {
  const [active, setActive] = useState(startNodeId ?? "n1");
  const [tab, setTab] = useState<"format" | "transition" | "layout">("format");
  const node = INITIAL_NODES.find((n) => n.id === active) ?? INITIAL_NODES[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-chrome">
      {/* Editor top toolbar */}
      <div className="h-10 border-b border-border bg-chrome flex items-center px-3 gap-1 text-ink shrink-0 text-[12px]">
        <ToolIcon>
          <Undo2 size={13} />
        </ToolIcon>
        <ToolIcon>
          <Redo2 size={13} />
        </ToolIcon>
        <Sep />
        <Dropdown label="100%" />
        <Dropdown label="Title layout" />
        <Sep />
        <Dropdown label="Manrope" />
        <div className="flex items-center border border-border rounded-md">
          <button className="px-1.5 text-muted-foreground hover:text-ink">
            −
          </button>
          <span className="px-2 text-[11px] font-mono">72</span>
          <button className="px-1.5 text-muted-foreground hover:text-ink">
            +
          </button>
        </div>
        <Sep />
        <ToolIcon>
          <Bold size={12} />
        </ToolIcon>
        <ToolIcon>
          <Italic size={12} />
        </ToolIcon>
        <ToolIcon>
          <Underline size={12} />
        </ToolIcon>
        <ToolIcon>
          <Strikethrough size={12} />
        </ToolIcon>
        <div
          className="w-5 h-5 rounded border border-border mx-1"
          style={{ background: "var(--accent-teal)" }}
        />
        <Sep />
        <ToolIcon>
          <AlignLeft size={12} />
        </ToolIcon>
        <ToolIcon>
          <AlignCenter size={12} />
        </ToolIcon>
        <ToolIcon>
          <AlignRight size={12} />
        </ToolIcon>
        <Sep />
        <ToolIcon>
          <Type size={12} />
        </ToolIcon>
        <ToolIcon>
          <ImageIcon size={12} />
        </ToolIcon>
        <ToolIcon>
          <Square size={12} />
        </ToolIcon>
        <Sep />
        <ToolIcon>
          <Layers size={12} />
        </ToolIcon>
        <ToolIcon>
          <Trash2 size={12} />
        </ToolIcon>
        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          {["X", "Y", "W", "H"].map((k) => (
            <div key={k} className="flex items-center gap-1">
              <span>{k}</span>
              <input
                defaultValue={k === "W" ? "928" : k === "H" ? "522" : "0"}
                className="w-12 px-1.5 py-0.5 border border-border rounded text-ink bg-card"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Slide strip */}
        <aside className="w-[224px] shrink-0 border-r border-border bg-chrome flex flex-col">
          <button className="m-3 py-1.5 text-[12px] font-semibold border border-dashed border-border rounded-md hover:bg-canvas/40 text-muted-foreground hover:text-ink">
            + New slide
          </button>
          <div className="overflow-y-auto px-3 pb-3 space-y-2">
            {INITIAL_NODES.map((n) => (
              <button
                key={n.id}
                onClick={() => setActive(n.id)}
                className={`w-full flex gap-2 items-start text-left p-1 rounded-md transition-all ${active === n.id ? "bg-canvas/60" : "hover:bg-canvas/30"}`}
              >
                <div className="text-[10px] font-mono text-muted-foreground pt-1 w-5">
                  {String(n.index).padStart(2, "0")}
                </div>
                <div
                  className={`flex-1 rounded border bg-card overflow-hidden h-[100px] ${active === n.id ? "border-[color:var(--accent-teal)] ring-1 ring-[color:var(--accent-teal)]/30" : "border-border"}`}
                >
                  {n.state === "rendered" ? (
                    <SlideThumb node={n} />
                  ) : (
                    <div className="h-full w-full bg-canvas/40 flex items-center justify-center text-[8px] font-mono text-muted-foreground">
                      ingredient
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 flex flex-col min-w-0 bg-canvas/60">
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div
              className="bg-white shadow-[0_10px_40px_-15px_oklch(0.3_0.01_175/0.3)] rounded-sm relative overflow-hidden"
              style={{ width: 928, height: 522 }}
            >
              {/* Big title slide layout */}
              <div
                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center"
                style={{ background: "var(--accent-teal)" }}
              >
                <div
                  className="text-white font-mono text-[10px] tracking-[0.4em] font-bold"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  PROJEKTOR
                </div>
              </div>
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
                    <div className="text-[13px] font-bold leading-tight">
                      Avery Kim
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Head of Strategy
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Speaker notes */}
          <div className="h-[100px] border-t border-border bg-chrome px-4 py-2 shrink-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
              Speaker notes
            </div>
            <textarea
              className="w-full h-[60px] mt-1 bg-transparent text-[12px] resize-none outline-none"
              defaultValue="Open with the topline — growth is steady, retention is up. Frame Q4 as a focus quarter, not an expansion quarter."
            />
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-[220px] shrink-0 border-l border-border bg-chrome flex flex-col">
          <div className="flex border-b border-border text-[11px] font-semibold">
            {(["format", "transition", "layout"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 capitalize transition-colors ${tab === t ? "text-ink border-b-2 border-[color:var(--accent-teal)] -mb-px" : "text-muted-foreground hover:text-ink"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="p-3 space-y-3 text-[11px] overflow-y-auto">
            <PanelRow label="Font">Manrope</PanelRow>
            <PanelRow label="Weight">800 · Extra Bold</PanelRow>
            <PanelRow label="Size">72 px</PanelRow>
            <PanelRow label="Line height">0.95</PanelRow>
            <PanelRow label="Color">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 rounded border border-border"
                  style={{ background: "var(--ink)" }}
                />
                <span className="font-mono text-[10px]">#1F2422</span>
              </div>
            </PanelRow>
            <div className="pt-2 border-t border-border">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Fill & border
              </div>
              <div className="flex gap-1.5">
                <div className="w-7 h-7 rounded border border-border bg-white" />
                <div className="w-7 h-7 rounded border-2 border-border bg-transparent" />
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Swatches
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  "oklch(0.24 0.009 185)",
                  "var(--accent-teal)",
                  "oklch(0.55 0.1 250)",
                  "oklch(0.65 0.12 30)",
                  "oklch(0.6 0.11 140)",
                  "oklch(0.99 0 0)",
                ].map((c) => (
                  <div
                    key={c}
                    className="w-6 h-6 rounded border border-border"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ToolIcon({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-canvas/60 text-ink">
      {children}
    </button>
  );
}
function Sep() {
  return <div className="w-px h-5 bg-border mx-1" />;
}
function Dropdown({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1 px-2 h-7 border border-border rounded-md text-[11px] hover:bg-canvas/40">
      {label} <ChevronDown size={11} />
    </button>
  );
}
function PanelRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-ink font-medium">{children}</span>
    </div>
  );
}
