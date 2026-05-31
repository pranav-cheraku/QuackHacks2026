import type { SlideNode, Edge } from "@/lib/projektor-data";

interface Props {
  nodes: SlideNode[];
  edges: Edge[];
  selectedId: string | null;
  onJump: (id: string) => void;
}

// Outline popover: an indented list of the tree. Click a row to fly the
// canvas to that node. (Focus + status filter live on the rail.)
export function GraphMapPanel({ nodes, edges, selectedId, onJump }: Props) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasParent = new Set(edges.map((e) => e.to));
  const roots = nodes
    .filter((n) => !hasParent.has(n.id))
    .sort((a, b) => a.index - b.index);
  const childrenOf = (id: string) =>
    edges
      .filter((e) => e.from === id)
      .map((e) => byId.get(e.to))
      .filter((n): n is SlideNode => Boolean(n))
      .sort((a, b) => a.index - b.index);

  // Flatten the tree into rows with a depth, guarding against cycles.
  const seen = new Set<string>();
  const rows: { node: SlideNode; depth: number }[] = [];
  const walk = (n: SlideNode, depth: number) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    rows.push({ node: n, depth });
    childrenOf(n.id).forEach((c) => walk(c, depth + 1));
  };
  roots.forEach((r) => walk(r, 0));
  nodes.forEach((n) => walk(n, 0)); // defensive: list any orphans too

  return (
    <div className="px-2 py-2 space-y-0.5">
      {rows.map(({ node, depth }) => {
        const active = node.id === selectedId;
        return (
          <button
            key={node.id}
            onClick={() => onJump(node.id)}
            style={{ paddingLeft: 8 + depth * 16 }}
            className={`w-full flex items-center gap-2 pr-2 py-1.5 rounded-md text-left text-[12.5px] transition-colors ${
              active
                ? "bg-accent-soft text-accent"
                : "text-ink hover:bg-canvas/70"
            }`}
          >
            <span className="font-mono text-[10px] text-muted-foreground shrink-0">
              {String(node.index).padStart(2, "0")}
            </span>
            <span className="truncate">{node.title}</span>
          </button>
        );
      })}
    </div>
  );
}
