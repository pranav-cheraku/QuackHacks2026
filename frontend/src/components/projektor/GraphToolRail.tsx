import { ListTree, Route, ListFilter, Map as MapIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  outlineOpen: boolean;
  filterOpen: boolean;
  onToggleOutline: () => void;
  onToggleFilter: () => void;
  focusPicked: boolean;
  onToggleFocus: () => void;
  minimapOpen: boolean;
  onToggleMinimap: () => void;
}

// Floating left rail — canvas navigation/view tools only (per graph_view_spec;
// authoring lives in Slides View). Outline + Focus + Status filter are the
// spec's "map"; Auto-tidy and Minimap are navigation aids.
export function GraphToolRail({
  outlineOpen,
  filterOpen,
  onToggleOutline,
  onToggleFilter,
  focusPicked,
  onToggleFocus,
  minimapOpen,
  onToggleMinimap,
}: Props) {
  return (
    <TooltipProvider
      delayDuration={100}
      skipDelayDuration={0}
      disableHoverableContent
    >
      <div
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-chrome border border-border shadow-[var(--sh-v)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <RailButton
          label="Outline"
          tip="Outline — jump to any slide"
          active={outlineOpen}
          onClick={onToggleOutline}
        >
          <ListTree size={18} />
        </RailButton>
        <RailButton
          label="Focus path"
          tip="Show only my picked path"
          active={focusPicked}
          onClick={onToggleFocus}
        >
          <Route size={18} />
        </RailButton>
        <RailButton
          label="Status filter"
          tip="Filter by status"
          active={filterOpen}
          onClick={onToggleFilter}
        >
          <ListFilter size={18} />
        </RailButton>

        <div className="w-5 h-px bg-border my-0.5" />

        <RailButton
          label="Minimap"
          tip="Minimap — overview of the graph"
          active={minimapOpen}
          onClick={onToggleMinimap}
        >
          <MapIcon size={18} />
        </RailButton>
      </div>
    </TooltipProvider>
  );
}

function RailButton({
  children,
  label,
  tip,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  tip: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
            active
              ? "text-white"
              : "text-ink/70 hover:bg-canvas/70 hover:text-ink"
          }`}
          style={active ? { background: "var(--accent)" } : undefined}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="bg-ink text-white border-0 font-medium"
      >
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
