import { Sparkles } from "lucide-react";

interface Props {
  onClick: () => void;
  dimmed?: boolean;
}

// A "Generate next" affordance node that hangs off a leaf slide. Clicking it
// asks the AI for two candidate next slides (the fork). It's its own node on
// the canvas — not a button inside the card — so the tree grows from here.
export function GenerateNode({ onClick, dimmed = false }: Props) {
  return (
    <button
      type="button"
      data-no-drag
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed text-[12px] font-semibold transition-colors hover:brightness-[0.98]"
      style={{
        width: 168,
        height: 42,
        borderColor: "var(--accent-line)",
        background: "var(--accent-soft)",
        color: "var(--accent-press)",
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <Sparkles size={13} /> Generate next
    </button>
  );
}
