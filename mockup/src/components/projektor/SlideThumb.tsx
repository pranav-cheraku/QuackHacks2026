import type { SlideNode } from "@/lib/projektor-data";

export function SlideThumb({ node }: { node: SlideNode }) {
  const w = node.width ?? 280;
  const h = node.height ?? 170;
  switch (node.thumb) {
    case "title":
      return (
        <div className="relative w-full h-full bg-white p-3 overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-2" style={{ background: "var(--accent-teal)" }} />
          <div className="text-[7px] font-mono uppercase tracking-wider" style={{ color: "var(--accent-teal)" }}>Q3 · FY26</div>
          <div className="mt-3 text-[18px] leading-tight font-extrabold text-ink">Strategy<br/>Review</div>
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
        <div className="w-full h-full bg-white p-3 flex flex-col">
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
        <div className="w-full h-full bg-white p-3 flex flex-col">
          <div className="text-[7px] font-mono uppercase tracking-wider text-muted-foreground">Growth Trajectory</div>
          <div className="flex-1 flex items-end gap-1.5 mt-2">
            {[28,42,38,55,61,72,68,84].map((v,i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${v}%`, background: i > 4 ? "var(--accent-teal)" : "oklch(0.85 0.02 192)" }} />
            ))}
          </div>
        </div>
      );
    case "list":
      return (
        <div className="w-full h-full bg-white p-3">
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
        <div className="w-full h-full bg-white flex flex-col items-center justify-center">
          <div className="text-[14px] font-extrabold">Let's build Q4.</div>
          <div className="text-[7px] mt-1 font-mono text-muted-foreground">— the team</div>
        </div>
      );
  }
}
