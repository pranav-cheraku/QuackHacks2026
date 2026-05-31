import { Minus, Plus, Grid3x3, Sparkles } from "lucide-react";

interface Props {
  mode: "board" | "editor";
  slideCount: number;
  branchCount: number;
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  isGridVisible: boolean;
  toggleGrid: () => void;
  deckName: string;
}

export function StatusBar({
  mode,
  slideCount,
  branchCount,
  zoom,
  zoomIn,
  zoomOut,
  isGridVisible,
  toggleGrid,
  deckName,
}: Props) {
  return (
    <footer className="h-7 border-t border-border bg-chrome flex items-center gap-3 px-3 text-[11px] font-mono text-muted-foreground shrink-0">
      <div className="shrink-0">
        {mode === "board" ? "Board" : "Editor"} · {slideCount} slides ·{" "}
        {branchCount} branches
      </div>
      <div className="min-w-0 flex-1 text-center opacity-70 truncate">{deckName}</div>
      <div className="shrink-0 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="w-5 h-5 flex items-center justify-center rounded hover:text-ink hover:bg-canvas/60 transition-colors"
            title="Zoom out"
          >
            <Minus size={11} />
          </button>
          <span className="w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={zoomIn}
            className="w-5 h-5 flex items-center justify-center rounded hover:text-ink hover:bg-canvas/60 transition-colors"
            title="Zoom in"
          >
            <Plus size={11} />
          </button>
        </div>
        <button
          onClick={toggleGrid}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
            isGridVisible
              ? "bg-[color:var(--accent-teal)] text-white"
              : "hover:text-ink hover:bg-canvas/60"
          }`}
          title={isGridVisible ? "Hide grid" : "Show grid"}
          aria-pressed={isGridVisible}
        >
          <Grid3x3 size={11} />
        </button>
        <button
          onClick={() => console.log("AI status clicked")}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-canvas/60 hover:opacity-85"
          style={{ color: "var(--accent-teal)" }}
          title="AI status"
        >
          <Sparkles size={11} /> AI ready
        </button>
      </div>
    </footer>
  );
}
