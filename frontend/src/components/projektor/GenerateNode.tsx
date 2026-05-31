import { Loader2, Sparkles } from "lucide-react";

interface Props {
  onClick: () => void;
  dimmed?: boolean;
  loading?: boolean;
}

// A "Generate next" affordance node that hangs off a leaf slide. Clicking it
// calls the Gemini expansion agent for two populated candidate next-slides (the
// fork). It's its own node on the canvas — not a button inside the card — so
// the tree grows from here. Shows a spinner while the agent is running.
export function GenerateNode({ onClick, dimmed = false, loading = false }: Props) {
  return (
    <button
      type="button"
      data-no-drag
      disabled={loading}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) onClick();
      }}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed text-[12px] font-semibold transition-colors hover:brightness-[0.98] disabled:cursor-not-allowed"
      style={{
        width: 168,
        height: 42,
        borderColor: "var(--accent-line)",
        background: "var(--accent-soft)",
        color: "var(--accent-press)",
        opacity: dimmed || loading ? 0.6 : 1,
      }}
    >
      {loading
        ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
        : <><Sparkles size={13} /> Generate next</>
      }
    </button>
  );
}
