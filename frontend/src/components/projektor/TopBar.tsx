import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Play, Check, Share2, LayoutGrid } from "lucide-react";

interface Props {
  mode: "board" | "editor";
  setMode: (m: "board" | "editor") => void;
  presentationName?: string;
}

const TABS: { value: "board" | "editor"; label: string }[] = [
  { value: "board", label: "Graph View" },
  { value: "editor", label: "Slides View" },
];

export function TopBar({
  mode,
  setMode,
  presentationName = "Meridian — Series A",
}: Props) {
  return (
    <header className="relative h-14 flex items-center px-3 gap-3 border-b border-border bg-chrome select-none shrink-0">
      {/* Left: logo · dashboard · current presentation */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Logo />
        {/* TODO: /dashboard is a temporary placeholder route — wire to the real
            "all presentations" view once it exists. */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold rounded-md text-ink hover:bg-canvas/70 transition-colors"
        >
          <LayoutGrid size={14} className="text-muted-foreground" />
          Dashboard
        </Link>

        <div className="h-5 w-px bg-border mx-1" />

        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <span className="font-semibold truncate">{presentationName}</span>
          <span className="flex items-center gap-1 text-muted-foreground font-mono text-[11px] shrink-0">
            <Check size={11} strokeWidth={2.5} /> Saved
          </span>
        </div>
      </div>

      {/* Center: view tabs */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-end gap-7">
        {TABS.map((t) => {
          const active = mode === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`text-[15px] transition-colors ${
                  active
                    ? "font-semibold"
                    : "font-medium text-muted-foreground hover:text-ink"
                }`}
                style={active ? { color: "var(--accent)" } : undefined}
              >
                {t.label}
              </span>
              <span
                className="h-[2.5px] w-full rounded-full"
                style={{ background: active ? "var(--accent)" : "transparent" }}
              />
            </button>
          );
        })}
      </nav>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Share2 size={14} /> Share
        </button>
        <button
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ink)" }}
        >
          <Play size={12} fill="white" /> Present
        </button>
      </div>
    </header>
  );
}
