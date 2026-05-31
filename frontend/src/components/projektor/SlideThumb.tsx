import type { SlideNode } from "@/lib/projektor-data";
import type { SlideElement } from "@/lib/slide-model";
import { gridToCSS } from "@/lib/grid";

// Renders a scaled-down slide thumbnail.
// Thumbnails are live projections of the slide elements, using the same grid math as the canvas.
export function SlideThumb({ node }: { node: SlideNode }) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      {node.elements.map((el) => (
        <ThumbElement key={el.id} el={el} />
      ))}
    </div>
  );
}

function ThumbElement({ el }: { el: SlideElement }) {
  const css = gridToCSS(el.placement);
  return (
    <div
      style={{
        ...css,
        opacity: el.opacity,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
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
            fontStyle: el.text.fontStyle,
            color: el.text.color,
            textAlign: el.text.textAlign,
            lineHeight: el.text.lineHeight ?? 1.3,
            letterSpacing: el.text.letterSpacing,
            fontFamily:
              el.text.fontFamily === "mono"
                ? "var(--font-mono, monospace)"
                : el.text.fontFamily === "serif"
                  ? "var(--font-serif, serif)"
                  : undefined,
            padding: "1px 2px",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
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
            border:
              el.shape.strokeWidth > 0
                ? `${el.shape.strokeWidth * 0.15}px solid ${el.shape.stroke}`
                : undefined,
          }}
        />
      )}
      {el.type === "image" &&
        (el.src ? (
          <img
            src={el.src}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
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
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
              <rect
                x="1"
                y="1"
                width="14"
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="6" cy="6" r="1.5" fill="currentColor" />
              <path
                d="M1 11l4-4 3 3 3-4 4 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
    </div>
  );
}
