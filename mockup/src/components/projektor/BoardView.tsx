import { useRef, useState } from "react";
import { ComponentTray } from "./ComponentTray";
import { SlideCard } from "./SlideCard";
import { VariantCard } from "./VariantCard";
import {
  INITIAL_NODES, INITIAL_EDGES, INITIAL_VARIANTS,
  type SlideNode, type Edge, type Variant, type ComponentType,
} from "@/lib/projektor-data";
import { Maximize2, Minus, Plus, Sparkles, Search } from "lucide-react";

interface Props {
  zoom: number;
  setZoom: (z: number) => void;
  onOpenEditor: (nodeId: string) => void;
}

function buildPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const cx1 = a.x + dx * 0.4;
  const cy1 = a.y + dy * 0.15 - Math.abs(dx) * 0.08;
  const cx2 = a.x + dx * 0.6;
  const cy2 = b.y - dy * 0.15 + Math.abs(dx) * 0.08;
  return `M ${a.x} ${a.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${b.x} ${b.y}`;
}

function anchor(n: SlideNode, side: "right" | "left" | "bottom") {
  const w = n.width ?? 280;
  const h = n.height ?? 170;
  if (side === "right")  return { x: n.x + w, y: n.y + h / 2 };
  if (side === "left")   return { x: n.x,      y: n.y + h / 2 };
  return { x: n.x + w / 2, y: n.y + h };
}

export function BoardView({ zoom, setZoom, onOpenEditor }: Props) {
  const [nodes, setNodes] = useState<SlideNode[]>(INITIAL_NODES);
  const [edges] = useState<Edge[]>(INITIAL_EDGES);
  const [variants, setVariants] = useState<Variant[]>(INITIAL_VARIANTS);
  const [selected, setSelected] = useState<string | null>("n3");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number } | null>(null);

  const findNode = (id: string) => nodes.find(n => n.id === id)!;

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setSelected(null);
    panRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    const move = (ev: MouseEvent) => {
      if (!panRef.current) return;
      setPan({ x: ev.clientX - panRef.current.x, y: ev.clientY - panRef.current.y });
    };
    const up = () => { panRef.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const generateVariants = () => {
    if (!selected) return;
    const parent = findNode(selected);
    if (variants.some(v => v.parentId === selected)) return;
    const baseY = parent.y + (parent.height ?? 170) + 120;
    const baseX = parent.x - 60;
    setVariants(vs => [...vs,
      { id: `v-${selected}-1`, parentId: selected, x: baseX,      y: baseY + 10, rotation: -1.5, layout: "stacked",  chosen: false },
      { id: `v-${selected}-2`, parentId: selected, x: baseX + 180, y: baseY + 30, rotation: 1,    layout: "centered", chosen: true  },
      { id: `v-${selected}-3`, parentId: selected, x: baseX + 360, y: baseY + 5,  rotation: -0.5, layout: "split",    chosen: false },
    ]);
  };

  return (
    <div className="flex-1 flex min-h-0">
      <ComponentTray onDragStart={() => {}} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Secondary toolbar */}
        <div className="h-9 border-b border-border bg-chrome flex items-center px-4 gap-4 shrink-0">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Deck flow</span>
          <span className="text-[11px] font-mono text-muted-foreground">{nodes.length} slides · {new Set(variants.map(v=>v.parentId)).size} branches</span>
          <button className="text-[11px] font-semibold text-muted-foreground hover:text-ink ml-2">Auto-arrange</button>
          <div className="ml-auto flex items-center gap-1.5 px-2 py-1 border border-border rounded-md bg-canvas/40 w-56">
            <Search size={11} className="text-muted-foreground" />
            <input placeholder="Find a slide..." className="bg-transparent outline-none text-[11px] flex-1 placeholder:text-muted-foreground/70" />
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 relative overflow-hidden dot-grid cursor-grab active:cursor-grabbing"
          onMouseDown={onCanvasMouseDown}
        >
          <div
            className="absolute origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: 2400, height: 1200 }}
          >
            {/* Edges */}
            <svg className="absolute inset-0 pointer-events-none overflow-visible" width="2400" height="1200">
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,0 L6,4 L0,8 Z" fill="oklch(0.54 0.105 192)" opacity="0.75" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const a = anchor(findNode(e.from), "right");
                const b = anchor(findNode(e.to), "left");
                return (
                  <path key={i} d={buildPath(a, b)} fill="none"
                    stroke="oklch(0.54 0.105 192)" strokeOpacity="0.55" strokeWidth="1.5"
                    strokeDasharray={e.dashed ? "5 4" : undefined}
                    markerEnd="url(#arrowhead)" />
                );
              })}
              {variants.map(v => {
                const parent = findNode(v.parentId);
                const a = anchor(parent, "bottom");
                const b = { x: v.x + 80, y: v.y };
                return (
                  <path key={v.id} d={buildPath(a, b)} fill="none"
                    stroke="oklch(0.54 0.105 192)" strokeOpacity="0.5" strokeWidth="1.25"
                    strokeDasharray="4 4" markerEnd="url(#arrowhead)" />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(n => (
              <div key={n.id} data-node>
                <SlideCard
                  node={n}
                  selected={selected === n.id}
                  onSelect={() => setSelected(n.id)}
                  onOpenEditor={() => onOpenEditor(n.id)}
                  onMove={(x, y) => setNodes(ns => ns.map(m => m.id === n.id ? { ...m, x, y } : m))}
                  onDropComponent={(c: ComponentType) =>
                    setNodes(ns => ns.map(m => m.id === n.id
                      ? { ...m, state: "ingredient", components: [...m.components, c] }
                      : m))
                  }
                  zoom={zoom}
                />
              </div>
            ))}

            {variants.map(v => (
              <div key={v.id} data-node><VariantCard v={v} /></div>
            ))}
          </div>

          {/* Floating toolbar */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-1 bg-chrome border border-border rounded-full shadow-[0_4px_20px_-6px_oklch(0.4_0.01_175/0.25)] px-1.5 py-1.5">
            <ToolBtn onClick={() => setZoom(Math.max(0.3, zoom - 0.05))}><Minus size={13} /></ToolBtn>
            <span className="px-2 text-[11px] font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <ToolBtn onClick={() => setZoom(Math.min(2, zoom + 0.05))}><Plus size={13} /></ToolBtn>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolBtn onClick={() => { setZoom(0.85); setPan({ x: 0, y: 0 }); }}><Maximize2 size={13} /></ToolBtn>
            <div className="w-px h-5 bg-border mx-1" />
            <button className="px-3 py-1.5 text-[12px] font-semibold rounded-full hover:bg-canvas/60 transition-colors flex items-center gap-1">
              <Plus size={12} /> Add slide
            </button>
            <button
              onClick={generateVariants}
              className="px-3 py-1.5 text-[12px] font-semibold rounded-full text-white transition-opacity hover:opacity-90 flex items-center gap-1.5 ml-1"
              style={{ background: "var(--accent-teal)" }}
            >
              <Sparkles size={12} /> Generate variants
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-canvas/60 transition-colors text-ink">
      {children}
    </button>
  );
}
