import {
  AlignLeft,
  BarChart3,
  Hash,
  Heading,
  Heading2,
  Image as ImageIcon,
  List as ListIcon,
  Quote,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "./projektor-data";

// The "+ Add content" menu, split into Text and Media groups (per the spec).
// Shared by the Inspect panel and the content graph screen.
export const ADD_TEXT: { type: ComponentType; label: string }[] = [
  { type: "Header", label: "Header" },
  { type: "Subheader", label: "Subheader" },
  { type: "Body", label: "Body" },
  { type: "List", label: "Bullet list" },
  { type: "Stat", label: "Stat / number" },
  { type: "Quote", label: "Quote" },
];

export const ADD_MEDIA: { type: ComponentType; label: string }[] = [
  { type: "Image", label: "Image" },
  { type: "Video", label: "Video" },
  { type: "Chart", label: "Chart" },
];

const ICONS: Partial<Record<ComponentType, LucideIcon>> = {
  Header: Heading,
  Subheader: Heading2,
  Body: AlignLeft,
  List: ListIcon,
  Stat: Hash,
  Quote: Quote,
  Image: ImageIcon,
  Video: Video,
  Chart: BarChart3,
};

export function blockIcon(type: ComponentType): LucideIcon {
  return ICONS[type] ?? AlignLeft;
}
