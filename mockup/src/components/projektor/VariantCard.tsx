import { Check } from "lucide-react";
import type { Variant } from "@/lib/projektor-data";

export function VariantCard({ v }: { v: Variant }) {
  return (
    <div
      className="absolute"
      style={{ left: v.x, top: v.y, width: 160, transform: `rotate(${v.rotation}deg)` }}
    >
      <div className={`rounded-md border bg-card shadow-sm overflow-hidden ${v.chosen ? "border-[color:var(--accent-teal)] ring-1 ring-[color:var(--accent-teal)]/30" : "border-border opacity-70"}`}>
        <div className="h-[90px] bg-white p-2 relative">
          {v.layout === "stacked" && (
            <div className="space-y-1.5">
              <div className="h-2 w-2/3 bg-ink rounded-sm" />
              <div className="h-1 w-full bg-muted rounded-sm" />
              <div className="h-1 w-5/6 bg-muted rounded-sm" />
              <div className="h-6 w-full mt-1 rounded-sm" style={{ background: "var(--accent-soft)" }} />
            </div>
          )}
          {v.layout === "centered" && (
            <div className="h-full flex flex-col items-center justify-center gap-1">
              <div className="h-2 w-1/2 bg-ink rounded-sm" />
              <div className="h-1 w-3/4 bg-muted rounded-sm" />
              <div className="h-1 w-2/3 bg-muted rounded-sm" />
            </div>
          )}
          {v.layout === "split" && (
            <div className="h-full flex gap-1.5">
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-full bg-ink rounded-sm" />
                <div className="h-1 w-full bg-muted rounded-sm" />
                <div className="h-1 w-2/3 bg-muted rounded-sm" />
              </div>
              <div className="flex-1 rounded-sm" style={{ background: "var(--accent-soft)" }} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 text-center text-[9px] font-mono">
        {v.chosen ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white" style={{ background: "var(--accent-teal)" }}>
            <Check size={8} strokeWidth={3}/> Chosen
          </span>
        ) : (
          <span className="text-muted-foreground">variant</span>
        )}
      </div>
    </div>
  );
}
