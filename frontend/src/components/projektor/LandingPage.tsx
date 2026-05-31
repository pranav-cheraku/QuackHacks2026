// Landing page — brain-dump intake that produces the storyboard graph.
// What was cut from the old version and why:
//   • Feature chips (×3 above heading) — pure marketing copy, adds noise before the input
//   • Description paragraph — redundant with the heading
//   • Footer with repeat chips + copyright — unnecessary chrome for an intake screen
//   • Voice recording button — stub, non-functional, distracting
//   • "Upload image dump" button — collapsed into a single "Attach files" action
//   • "Brand Identity Extraction" verbose panel label — replaced with a plain URL input
//   • "Start from a blank board instead" skip link — generation is the only path now
// What was added:
//   • Dashboard link in header so the user is never stranded
//   • Wired file input (.txt .md .pdf and common docs) — text extracted and appended to brain-dump

import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { hydrateToSlides, type TargetDuration, type HydrateResult } from "@/lib/chunker";
import { Globe, Paperclip, ArrowRight, Loader2, X, FileText } from "lucide-react";

interface Props {
  onGenerate: (result: HydrateResult) => void;
}

const DURATION_OPTIONS: { value: TargetDuration; label: string }[] = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 20, label: "20 min" },
];

// ── File text extraction ──────────────────────────────────────────────────────
// Supported: .txt .md .csv .json (via File.text())
// PDF: extract printable ASCII from binary — works for text-based PDFs,
//      not scanned/image PDFs. For richer extraction, integrate pdfjs-dist
//      or send the PDF to Gemini via the Files API in a future version.
async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isText =
    file.type.startsWith("text/") ||
    name.endsWith(".md") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".json");

  if (isText) {
    const content = await file.text();
    return `--- ${file.name} ---\n${content}`;
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    // Attempt ASCII text extraction from PDF binary.
    // Limitation: garbled output for scanned/image PDFs.
    const buf = await file.arrayBuffer();
    const raw = new TextDecoder("latin1").decode(new Uint8Array(buf));
    // Pull out printable sequences, collapse whitespace
    const extracted = raw
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s{3,}/g, "\n")
      .trim()
      .slice(0, 8000);
    return `--- ${file.name} (PDF — text extraction, may be incomplete) ---\n${extracted}`;
  }

  // Generic fallback — try as text
  try {
    const content = await file.text();
    return `--- ${file.name} ---\n${content.slice(0, 8000)}`;
  } catch {
    return `--- ${file.name}: could not read. Describe its content in the text area. ---`;
  }
}

export function LandingPage({ onGenerate }: Props) {
  const [text, setText] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [duration, setDuration] = useState<TargetDuration>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    // Extract text and append to the brain-dump textarea
    const texts = await Promise.all(newFiles.map(extractFileText));
    setText((prev) => (prev ? `${prev}\n\n${texts.join("\n\n")}` : texts.join("\n\n")));
    // Reset the input so the same file can be re-attached if needed
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Add some content first — paste notes, a rough outline, or attach a doc.");
      return;
    }
    setError(null);
    setUsedMock(false);
    setIsGenerating(true);
    try {
      // Prepend brand URL as context if provided (not yet used by Gemini agent
      // for palette extraction — future brand-identity-agent swap point)
      const fullText = brandUrl.trim()
        ? `Brand / company URL: ${brandUrl.trim()}\n\n${text.trim()}`
        : text.trim();
      const result = await hydrateToSlides(fullText, duration);
      if (result.source === "mock") setUsedMock(true);
      onGenerate(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      if (msg.includes("[GEMINI_KEY_MISSING]"))
        setError("Gemini key not found — add GEMINI_API_KEY to frontend/.env and restart.");
      else if (msg.includes("[GEMINI_API_ERROR]"))
        setError("Gemini API error — check your key, quota, and network, then try again.");
      else if (msg.includes("[GEMINI_PARSE_ERROR]") || msg.includes("[GEMINI_SCHEMA_ERROR]"))
        setError("Gemini returned unexpected output. Try again or shorten your text.");
      else
        setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#edf0f8" }}>
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(22,160,133,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(22,160,133,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 h-14 flex items-center justify-between px-5 bg-white/60 backdrop-blur-sm border-b border-border/60">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold text-[15px] text-ink">Projektor</span>
        </div>
        <Link
          to="/dashboard"
          className="text-[13px] text-muted-foreground hover:text-ink transition-colors px-3 py-1.5 rounded-lg hover:bg-canvas/60"
        >
          Dashboard
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="font-serif text-[44px] sm:text-[52px] font-bold text-ink text-center leading-[1.05] max-w-[620px] mb-8">
          Author the argument.
          <br />
          We'll build the deck.
        </h1>

        <div className="w-full max-w-[640px] space-y-3">
          {/* Brain-dump textarea card */}
          <div className="bg-white rounded-2xl border border-border shadow-[0_2px_24px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Paste notes, ramble your pitch, or drop a rough outline. Don't worry about structure — that's our job."
              className="w-full px-5 pt-4 pb-3 text-[14px] leading-relaxed text-ink placeholder:text-muted-foreground bg-transparent resize-none outline-none font-sans"
              style={{ minHeight: 200 }}
            />

            {/* Attached file chips */}
            {attachedFiles.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {attachedFiles.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas border border-border text-[11px] text-muted-foreground"
                  >
                    <FileText size={10} />
                    {f.name}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="hover:text-ink transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Attach files row */}
            <div className="border-t border-border px-4 py-2.5 flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.pdf,.csv,.json,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-ink hover:bg-canvas/60 transition-colors"
              >
                <Paperclip size={13} />
                Attach docs or PDFs
              </button>
              <span className="ml-2 text-[11px] text-muted-foreground/60">
                .txt .md .pdf .docx — text extracted automatically
              </span>
            </div>
          </div>

          {/* Controls row: brand URL + duration + generate */}
          <div className="flex items-stretch gap-3">
            {/* Brand URL — context hint for future brand agent */}
            <div className="flex-1 bg-white rounded-xl border border-border shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] px-4 py-3 flex items-center gap-2">
              <Globe size={14} className="text-muted-foreground shrink-0" />
              <input
                type="url"
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                placeholder="Brand URL (optional)"
                className="flex-1 text-[13px] text-ink placeholder:text-muted-foreground bg-transparent outline-none"
              />
            </div>

            {/* Duration + Generate */}
            <div className="bg-white rounded-xl border border-border shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] px-4 py-3 flex items-center gap-2 shrink-0">
              <div className="flex rounded-lg border border-border overflow-hidden text-[12px] font-medium">
                {DURATION_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDuration(value)}
                    className={`px-3 py-1.5 transition-colors ${
                      duration === value
                        ? "bg-ink text-white"
                        : "text-muted-foreground hover:text-ink hover:bg-canvas/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="ml-2 flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: "var(--accent)" }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Building storyboard…
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

          {/* Error */}
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-600">
              {error}
            </div>
          )}

          {/* Mock-mode notice */}
          {usedMock && !error && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-700">
              ⚠ Gemini was unreachable — storyboard built with mock generation. Check your key and restart the dev server.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
