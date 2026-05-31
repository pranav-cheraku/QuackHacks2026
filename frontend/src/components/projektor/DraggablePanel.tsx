import { useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";

interface Props {
  title: string;
  defaultPos: { x: number; y: number };
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

// A floating panel the user can drag around by its header. Position is local
// (resets to defaultPos when reopened). Stops mousedown so it never pans canvas.
export function DraggablePanel({
  title,
  defaultPos,
  onClose,
  width = 248,
  children,
}: Props) {
  const [pos, setPos] = useState(defaultPos);
  const drag = useRef<{
    sx: number;
    sy: number;
    px: number;
    py: number;
  } | null>(null);

  const onHandleDown = (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
    const move = (ev: MouseEvent) => {
      if (!drag.current) return;
      setPos({
        x: drag.current.px + (ev.clientX - drag.current.sx),
        y: drag.current.py + (ev.clientY - drag.current.sy),
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      className="absolute z-20 flex flex-col max-h-[68vh] rounded-xl border border-border bg-chrome shadow-[var(--sh-v)] overflow-hidden"
      style={{ left: pos.x, top: pos.y, width }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        onMouseDown={onHandleDown}
        className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <GripVertical size={12} className="text-faint shrink-0" />
        <span className="flex-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="text-muted-foreground hover:text-ink transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
