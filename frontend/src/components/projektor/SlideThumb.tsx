import type { SlideNode } from "@/lib/projektor-data";
import type { LeafNode } from "@/lib/ir";
import { collectLeaves } from "@/lib/ir";
import { gridToCSS } from "@/lib/grid";

export function SlideThumb({ node }: { node: SlideNode }) {
  const leaves = [...collectLeaves(node.root!)].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      {leaves.map((leaf) => (
        <ThumbLeaf key={leaf.id} leaf={leaf} />
      ))}
    </div>
  );
}

function ThumbLeaf({ leaf }: { leaf: LeafNode }) {
  const css = gridToCSS(leaf.placement);
  const textBlock  = leaf.block.role === "text"  ? leaf.block : null;
  const shapeBlock = leaf.block.role === "shape" ? leaf.block : null;
  const imageBlock = leaf.block.role === "image" ? leaf.block : null;

  return (
    <div
      style={{
        ...css,
        opacity: leaf.opacity ?? 1,
        transform: (leaf.rotation ?? 0) ? `rotate(${leaf.rotation}deg)` : undefined,
        zIndex: (leaf.zIndex ?? 0) + 10,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {textBlock && (
        <div
          style={{
            fontSize: Math.max(4, textBlock.style.fontSize * 0.15),
            fontWeight: textBlock.style.fontWeight,
            fontStyle: textBlock.style.fontStyle,
            color: textBlock.style.color,
            textAlign: textBlock.style.textAlign,
            lineHeight: textBlock.style.lineHeight ?? 1.3,
            letterSpacing: textBlock.style.letterSpacing,
            fontFamily:
              textBlock.style.fontFamily === "mono" ? "var(--font-mono, monospace)" :
              textBlock.style.fontFamily === "serif" ? "var(--font-serif, serif)" :
              undefined,
            padding: "1px 2px",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {textBlock.text}
        </div>
      )}
      {shapeBlock && (
        <div
          style={{
            width: "100%", height: "100%",
            background: shapeBlock.style.fill,
            borderRadius: shapeBlock.style.borderRadius / 4,
            border: shapeBlock.style.strokeWidth > 0
              ? `${shapeBlock.style.strokeWidth * 0.15}px solid ${shapeBlock.style.stroke}`
              : undefined,
          }}
        />
      )}
      {imageBlock && (
        imageBlock.src ? (
          <img src={imageBlock.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              background: "oklch(0.92 0.01 192 / 0.4)",
              border: "1px dashed oklch(0.54 0.105 192 / 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/><path d="M1 11l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        )
      )}
    </div>
  );
}
