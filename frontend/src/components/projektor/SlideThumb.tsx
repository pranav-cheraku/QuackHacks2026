import type { SlideNode } from "@/lib/projektor-data";
import type { SlideElement } from "@/lib/slide-model";
import { gridToCSS } from "@/lib/grid";

// Renders a scaled-down slide thumbnail.
// The static `thumb` type draws the template background.
// The `elements` array is rendered on top using the same grid math as the canvas —
// this is what keeps thumbnails in sync with live edits.
export function SlideThumb({ node }: { node: SlideNode }) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      {/* Static template background */}
      <ThumbBackground thumb={node.thumb} />

      {/* Live user elements — same positioning as canvas, scales with container */}
      {node.elements.map((el) => (
        <ThumbElement key={el.id} el={el} />
      ))}
    </div>
  );
}

function ThumbBackground({ thumb }: { thumb: SlideNode["thumb"] }) {
  switch (thumb) {
    case "title":
      return (
        <div className="absolute inset-0 bg-white p-3 overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-2" style={{ background: "var(--accent-teal)" }} />
          <div className="text-[7px] font-mono uppercase tracking-wider" style={{ color: "var(--accent-teal)" }}>Q3 · FY26</div>
          <div className="mt-3 text-[18px] leading-tight font-extrabold text-ink">Strategy<br />Review</div>
          <div className="mt-2 text-[7px] text-muted-foreground leading-tight">Aligning Q4 priorities across product, sales, and ops.</div>
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full" style={{ background: "oklch(0.55 0.1 250)" }} />
            <div>
              <div className="text-[6px] font-bold leading-none">Avery Kim</div>
              <div className="text-[5px] text-muted-foreground leading-none mt-0.5">Head of Strategy</div>
            </div>
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="absolute inset-0 bg-white p-3 flex flex-col">
          <div className="text-[7px] font-mono uppercase tracking-wider text-muted-foreground">By the Numbers</div>
          <div className="flex-1 grid grid-cols-3 gap-2 mt-2 items-center">
            {[["+18%","YoY growth"],["2.4M","Active users"],["94%","Retention"]].map(([n,l]) => (
              <div key={l}>
                <div className="text-[20px] font-extrabold leading-none" style={{ color: "var(--accent-teal)" }}>{n}</div>
                <div className="text-[6px] mt-1 text-muted-foreground uppercase tracking-wide">{l}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "chart":
      return (
        <div className="absolute inset-0 bg-white p-3 flex flex-col">
          <div className="text-[7px] font-mono uppercase tracking-wider text-muted-foreground">Growth Trajectory</div>
          <div className="flex-1 flex items-end gap-1.5 mt-2">
            {[28,42,38,55,61,72,68,84].map((v,i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height:`${v}%`, background: i>4 ? "var(--accent-teal)" : "oklch(0.85 0.02 192)" }} />
            ))}
          </div>
        </div>
      );
    case "list":
      return (
        <div className="absolute inset-0 bg-white p-3">
          <div className="text-[7px] font-mono uppercase tracking-wider text-muted-foreground">Three Bets for Q4</div>
          <div className="mt-2 space-y-2">
            {["Ship the workspace API","Double down on mid-market","Land 3 design partners"].map((t,i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="text-[10px] font-extrabold w-3" style={{ color: "var(--accent-teal)" }}>{i+1}</div>
                <div className="text-[9px] font-semibold leading-tight">{t}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "closing":
      return (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center">
          <div className="text-[14px] font-extrabold">Let's build Q4.</div>
          <div className="text-[7px] mt-1 font-mono text-muted-foreground">— the team</div>
        </div>
      );
  }
}

function ThumbElement({ el }: { el: SlideElement }) {
  const css = gridToCSS(el.placement);
  return (
    <div
      style={{
        ...css,
        opacity: el.opacity,
        zIndex: el.zIndex + 10,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {el.type === "text" && el.text && (
        <div
          style={{
            fontSize: Math.max(4, el.text.fontSize * 0.15),
            fontWeight: el.text.fontWeight,
            color: el.text.color,
            textAlign: el.text.textAlign,
            lineHeight: 1.3,
            padding: "1px 2px",
            wordBreak: "break-word",
          }}
        >
          {el.text.content}
        </div>
      )}
      {el.type === "shape" && el.shape && (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: el.shape.fill,
            borderRadius: el.shape.borderRadius / 4,
            border: el.shape.strokeWidth > 0 ? `${el.shape.strokeWidth * 0.15}px solid ${el.shape.stroke}` : undefined,
          }}
        />
      )}
      {el.type === "image" && (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "oklch(0.92 0.01 192 / 0.4)",
            border: "1px dashed oklch(0.54 0.105 192 / 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/><path d="M1 11l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      )}
    </div>
  );
}
