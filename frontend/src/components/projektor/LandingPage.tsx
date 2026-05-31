import { useState } from "react";
import { Logo } from "./Logo";
import { hydrateToSlides, type TargetDuration } from "@/lib/chunker";
import type { SlideNode } from "@/lib/projektor-data";
import { Globe, Mic, Paperclip, ImageIcon, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  onGenerate: (nodes: SlideNode[]) => void;
  onSkip: () => void;
}

const FEATURE_CHIPS = [
  { icon: "⌘", label: "Looks great by construction" },
  { icon: "✎", label: "Edits the argument, not just pixels" },
  { icon: "→", label: "One source → slides, mobile, PDF" },
];

const DURATION_OPTIONS: { value: TargetDuration; label: string }[] = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 20, label: "20 min" },
];

export function LandingPage({ onGenerate, onSkip }: Props) {
  const [text, setText] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [duration, setDuration] = useState<TargetDuration>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Add some content to the brain-dump first.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const nodes = await hydrateToSlides(text.trim(), duration);
      onGenerate(nodes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#edf0f8" }}>
      {/* ── Background grid ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(22,160,133,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(22,160,133,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Top bar ── */}
      <header className="relative z-10 h-14 flex items-center justify-between px-5 bg-white/60 backdrop-blur-sm border-b border-border/60">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold text-[15px] text-ink">Projektor</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-canvas/60 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 2.21-.9 3.41-1.72 4.1-.27.23-.28.63-.03.89.14.15.34.24.55.24H13.7c.21 0 .41-.09.55-.24.25-.26.24-.66-.03-.89C13.4 9.41 12.5 8.21 12.5 6A4.5 4.5 0 0 0 8 1.5ZM8 15a2 2 0 0 0 1.73-1H6.27A2 2 0 0 0 8 15Z" fill="currentColor"/>
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-[oklch(0.55_0.1_250)] flex items-center justify-center text-[11px] font-bold text-white">
            Z
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Feature chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {FEATURE_CHIPS.map((chip) => (
            <div
              key={chip.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/70 text-[12px] font-medium text-ink"
            >
              <span className="text-[13px] text-muted-foreground font-mono">{chip.icon}</span>
              {chip.label}
            </div>
          ))}
        </div>

        {/* Heading */}
        <h1 className="font-serif text-[44px] sm:text-[52px] font-bold text-ink text-center leading-[1.05] max-w-[620px] mb-3">
          Author the argument.
          <br />
          We'll build the deck.
        </h1>
        <p className="text-center text-muted-foreground text-[15px] max-w-[480px] leading-relaxed mb-8">
          Drop in your thinking and a brand. Projektor structures it into a
          presentation — design, layout, and flow handled for you.
        </p>

        {/* Input card */}
        <div className="w-full max-w-[640px]">
          <div className="bg-white rounded-2xl border border-border shadow-[0_2px_24px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* Textarea */}
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Paste notes, ramble your pitch, or drop a rough outline. Don't worry about structure — that's our job."
              className="w-full px-5 pt-4 pb-3 text-[14px] leading-relaxed text-ink placeholder:text-muted-foreground bg-transparent resize-none outline-none font-sans"
              style={{ minHeight: 210 }}
            />

            {/* Action row */}
            <div className="border-t border-border px-4 py-3 flex items-center gap-1.5">
              {[
                { icon: Mic, label: "Record a voice brain-dump" },
                { icon: Paperclip, label: "Attach docs / dataset" },
                { icon: ImageIcon, label: "Upload image dump" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-ink hover:bg-canvas/60 transition-colors"
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls panel — brand + duration + generate */}
          <div className="mt-3 flex items-stretch gap-3">
            {/* Brand URL */}
            <div className="flex-1 bg-white rounded-xl border border-border shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] px-4 py-3.5">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Brand Identity Extraction
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-muted-foreground shrink-0" />
                <input
                  type="url"
                  value={brandUrl}
                  onChange={(e) => setBrandUrl(e.target.value)}
                  placeholder="Paste a company URL"
                  className="flex-1 text-[13px] text-ink placeholder:text-muted-foreground bg-transparent outline-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                We'll extract your palette + fonts.
              </p>
            </div>

            {/* Duration + Generate */}
            <div className="bg-white rounded-xl border border-border shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] px-4 py-3.5 flex flex-col justify-between min-w-[280px]">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Target Duration
              </div>
              <div className="flex items-center gap-2">
                {/* Segmented toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden text-[12px] font-medium">
                  {DURATION_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDuration(value)}
                      className={`px-4 py-1.5 transition-colors ${
                        duration === value
                          ? "bg-ink text-white"
                          : "text-muted-foreground hover:text-ink hover:bg-canvas/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Generate button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)" }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      Generate deck
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-600">
              {error}
            </div>
          )}

          {/* Skip link */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-[13px] text-muted-foreground hover:text-ink transition-colors underline-offset-2 hover:underline"
            >
              Start from a blank board instead
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-5">
            {FEATURE_CHIPS.map((c) => (
              <span key={c.label} className="flex items-center gap-1">
                <span className="font-mono">{c.icon}</span> {c.label}
              </span>
            ))}
          </div>
          <span>© 2026 Projektor. Built with Agentic Intelligence.</span>
        </div>
      </footer>
    </div>
  );
}
