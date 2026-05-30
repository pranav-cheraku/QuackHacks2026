import { Logo } from "./Logo";
import { Play, Check, Share2 } from "lucide-react";

interface Props {
  mode: "board" | "editor";
  setMode: (m: "board" | "editor") => void;
  deckTitle: string;
}

const AVATARS = [
  { i: "AK", c: "oklch(0.65 0.12 30)" },
  { i: "JR", c: "oklch(0.55 0.1 250)" },
  { i: "MT", c: "oklch(0.6 0.11 140)" },
];

export function TopBar({ mode, setMode, deckTitle }: Props) {
  return (
    <header className="h-12 flex items-center px-3 gap-4 border-b border-border bg-chrome select-none shrink-0">
      <Logo />
      <div className="h-5 w-px bg-border" />
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-semibold">{deckTitle}</span>
        <span className="flex items-center gap-1 text-muted-foreground font-mono text-[11px]">
          <Check size={11} strokeWidth={2.5} /> Saved
        </span>
      </div>

      <nav className="flex items-center gap-4 ml-6 text-[12.5px] text-muted-foreground">
        {["File","Edit","View","Insert","Arrange","Help"].map(m => (
          <button key={m} className="hover:text-ink transition-colors">{m}</button>
        ))}
      </nav>

      <div className="ml-4 flex items-center rounded-md border border-border p-0.5 bg-canvas/40">
        {(["board","editor"] as const).map(v => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={`px-3 py-1 text-[12px] font-semibold rounded-[4px] capitalize transition-all ${
              mode === v ? "bg-chrome shadow-sm text-ink" : "text-muted-foreground hover:text-ink"
            }`}
          >{v}</button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex -space-x-1.5">
          {AVATARS.map(a => (
            <div key={a.i} className="w-6 h-6 rounded-full ring-2 ring-chrome flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: a.c }}>{a.i}</div>
          ))}
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold border border-border rounded-md hover:bg-canvas/50 transition-colors">
          <Share2 size={12} /> Share
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-teal)" }}
        >
          <Play size={11} fill="white" /> Present
        </button>
      </div>
    </header>
  );
}
