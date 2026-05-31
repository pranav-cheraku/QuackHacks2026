import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADD_MEDIA, ADD_TEXT, blockIcon } from "@/lib/content-blocks";
import type { ComponentType } from "@/lib/projektor-data";

// The "+ Add content" dropdown (Text / Media groups). Shared by the Inspect
// panel and the content graph screen so they stay in lock-step.
export function AddContentMenu({
  onAdd,
}: {
  onAdd: (type: ComponentType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-semibold text-accent hover:bg-accent-soft/60 transition-colors"
        >
          <Plus size={12} /> Add content
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[176px] bg-chrome border-border"
      >
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Text
        </DropdownMenuLabel>
        {ADD_TEXT.map((o) => (
          <Row
            key={o.type}
            type={o.type}
            label={o.label}
            onSelect={() => onAdd(o.type)}
          />
        ))}
        <DropdownMenuSeparator className="bg-line-soft" />
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Media
        </DropdownMenuLabel>
        {ADD_MEDIA.map((o) => (
          <Row
            key={o.type}
            type={o.type}
            label={o.label}
            onSelect={() => onAdd(o.type)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Row({
  type,
  label,
  onSelect,
}: {
  type: ComponentType;
  label: string;
  onSelect: () => void;
}) {
  const Icon = blockIcon(type);
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className="gap-2 text-[13px] cursor-pointer focus:bg-canvas focus:text-ink"
    >
      <Icon size={14} className="text-muted-foreground" />
      {label}
    </DropdownMenuItem>
  );
}
