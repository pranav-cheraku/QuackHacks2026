import { ArrowLeft, X } from "lucide-react";
import { AddContentMenu } from "./AddContentMenu";
import { blockIcon } from "@/lib/content-blocks";
import type { ComponentType, SlideNode } from "@/lib/projektor-data";

interface Props {
  scene: SlideNode;
  onBack: () => void;
  onAddBlock: (id: string, type: ComponentType) => void;
  onRemoveBlock: (id: string, blockId: string) => void;
}

const SCENE_W = 268;
const SCENE_H = 92;
const BLOCK_W = 190;
const BLOCK_H = 62;
const GAP_X = 28;
const SCENE_Y = 32;
const BLOCK_Y = SCENE_Y + SCENE_H + 96;

// The content graph: one scene's blocks as their own little graph — the scene
// at top, its content "ingredients" tethered below. View + add/remove only;
// filling in the actual text happens in Slides View.
export function ContentGraphView({
  scene,
  onBack,
  onAddBlock,
  onRemoveBlock,
}: Props) {
  const blocks = scene.blocks ?? [];
  const rowWidth =
    blocks.length > 0
      ? blocks.length * BLOCK_W + (blocks.length - 1) * GAP_X
      : SCENE_W;
  const innerWidth = Math.max(rowWidth, SCENE_W) + 80;
  const innerHeight = BLOCK_Y + BLOCK_H + 48;
  const centerX = innerWidth / 2;
  const sceneX = centerX - SCENE_W / 2;
  const blocksStartX = centerX - rowWidth / 2;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Breadcrumb header */}
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border bg-chrome shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-semibold text-ink hover:bg-canvas/70 transition-colors"
        >
          <ArrowLeft size={15} /> Back to graph
        </button>
        <div className="h-5 w-px bg-border mx-1" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          Content
        </span>
        <span className="font-serif text-[16px] text-ink truncate">
          {scene.title}
        </span>
        <div className="ml-auto">
          <AddContentMenu onAdd={(type) => onAddBlock(scene.id, type)} />
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 overflow-auto dot-grid">
        <div className="min-w-full flex justify-center py-10">
          <div
            className="relative"
            style={{ width: innerWidth, height: innerHeight }}
          >
            {/* edges scene → block */}
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              width={innerWidth}
              height={innerHeight}
            >
              <defs>
                <marker
                  id="content-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L6,4 L0,8 Z" fill="var(--accent)" />
                </marker>
              </defs>
              {blocks.map((b, i) => {
                const bx = blocksStartX + i * (BLOCK_W + GAP_X) + BLOCK_W / 2;
                const ay = SCENE_Y + SCENE_H;
                return (
                  <path
                    key={b.id}
                    d={`M ${centerX} ${ay} C ${centerX} ${ay + 44}, ${bx} ${BLOCK_Y - 44}, ${bx} ${BLOCK_Y}`}
                    fill="none"
                    stroke="var(--accent)"
                    strokeOpacity={0.5}
                    strokeWidth="1.5"
                    markerEnd="url(#content-arrow)"
                  />
                );
              })}
            </svg>

            {/* Scene node */}
            <div
              className="absolute rounded-2xl bg-card border border-border shadow-[var(--sh-v)] px-4 py-3"
              style={{ left: sceneX, top: SCENE_Y, width: SCENE_W }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink text-white font-mono text-[11px] font-semibold shrink-0">
                  {String(scene.index).padStart(2, "0")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {scene.kind}
                </span>
              </div>
              <div className="mt-1.5 font-serif text-[18px] leading-tight text-ink truncate">
                {scene.title}
              </div>
            </div>

            {/* Block nodes */}
            {blocks.map((b, i) => {
              const Icon = blockIcon(b.type);
              const left = blocksStartX + i * (BLOCK_W + GAP_X);
              return (
                <div
                  key={b.id}
                  className="group absolute flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3"
                  style={{
                    left,
                    top: BLOCK_Y,
                    width: BLOCK_W,
                    height: BLOCK_H,
                  }}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-canvas text-ink-soft shrink-0">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {b.type}
                    </span>
                    <span className="block text-[13px] text-ink truncate">
                      {b.label}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${b.type}`}
                    onClick={() => onRemoveBlock(scene.id, b.id)}
                    className="text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}

            {/* Empty state */}
            {blocks.length === 0 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 text-center"
                style={{ top: BLOCK_Y }}
              >
                <p className="text-[13px] text-muted-foreground">
                  No content yet.
                </p>
                <p className="text-[12px] text-faint mt-0.5">
                  Use “+ Add content” to add this scene’s ingredients.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
