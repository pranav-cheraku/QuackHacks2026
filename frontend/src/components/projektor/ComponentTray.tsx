import {
  CONTENT_COMPONENTS,
  MEDIA_COMPONENTS,
  type ComponentType,
} from "@/lib/projektor-data";

export function ComponentTray() {
  return (
    <aside className="w-[180px] shrink-0 border-r border-border bg-chrome flex flex-col">
      <div className="px-3 pt-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        Components
      </div>
      <div className="px-2 flex-1 overflow-y-auto space-y-4 pb-4">
        <Section label="Content" items={CONTENT_COMPONENTS} />
        <Section label="Media" items={MEDIA_COMPONENTS} />
      </div>
    </aside>
  );
}

function Section({ label, items }: { label: string; items: ComponentType[] }) {
  return (
    <div>
      <div className="px-1 pb-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <div className="space-y-1">
        {items.map((c) => (
          <div
            key={c}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("component", c)}
            className="px-2.5 py-1.5 text-[12px] font-medium rounded-md border border-border bg-canvas/40 cursor-grab active:cursor-grabbing hover:bg-card hover:shadow-[0_2px_8px_-2px_oklch(0.6_0.01_175/0.25)] hover:-translate-y-px transition-all"
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}
