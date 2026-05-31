import { Check } from "lucide-react";
import type { SceneStatus } from "@/lib/projektor-data";

const ROWS: { value: SceneStatus; label: string; dot: string }[] = [
  { value: "final", label: "Final", dot: "var(--ok)" }, // green
  { value: "in-review", label: "In Review", dot: "var(--warn)" }, // orange
  { value: "draft", label: "Draft", dot: "var(--danger)" }, // red
];

interface Props {
  active: Set<SceneStatus>;
  onToggle: (s: SceneStatus) => void;
}

// Status filter: show only the checked statuses; others dim on the canvas.
export function StatusFilterPanel({ active, onToggle }: Props) {
  return (
    <div className="px-2 py-2 space-y-0.5">
      {ROWS.map((r) => {
        const on = active.has(r.value);
        return (
          <button
            key={r.value}
            onClick={() => onToggle(r.value)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[12.5px] hover:bg-canvas/70 transition-colors"
          >
            <span
              className="w-4 h-4 rounded flex items-center justify-center shrink-0"
              style={{
                background: on ? "var(--accent)" : "transparent",
                border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {on && <Check size={11} className="text-white" strokeWidth={3} />}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: r.dot }}
            />
            <span className={on ? "text-ink" : "text-muted-foreground"}>
              {r.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
