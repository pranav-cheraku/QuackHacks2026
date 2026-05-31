import { Shapes } from "lucide-react";

// Temporary placeholder mark — swap for the real product logo once we have one.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[8px] text-white shrink-0"
      style={{ width: size, height: size, background: "var(--ink)" }}
      aria-label="App logo (placeholder)"
    >
      <Shapes size={Math.round(size * 0.55)} strokeWidth={2} />
    </div>
  );
}
