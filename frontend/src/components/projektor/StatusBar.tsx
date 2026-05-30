import { Minus, Plus, Grid3x3, Sparkles } from "lucide-react";

interface Props {
  mode: "board" | "editor";
  slideCount: number;
  branchCount: number;
  zoom: number;
  setZoom: (z: number) => void;
  deckName: string;
}

export function StatusBar({
  mode,
  slideCount,
  branchCount,
  zoom,
  setZoom,
  deckName,
}: Props) {
  return (
    <footer className="h-7 border-t border-border bg-chrome flex items-center px-3 text-[11px] font-mono text-muted-foreground shrink-0">
      <div>
        {mode === "board" ? "Board" : "Editor"} · {slideCount} slides ·{" "}
        {branchCount} branches
      </div>
      <div className="mx-auto opacity-70">{deckName}</div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.3, zoom - 0.05))}
            className="hover:text-ink"
          >
            <Minus size={11} />
          </button>
          <span className="w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.05))}
            className="hover:text-ink"
          >
            <Plus size={11} />
          </button>
        </div>
        <button className="hover:text-ink">
          <Grid3x3 size={11} />
        </button>
        <span
          className="flex items-center gap-1"
          style={{ color: "var(--accent-teal)" }}
        >
          <Sparkles size={11} /> AI ready
        </span>
      </div>
    </footer>
  );
}
