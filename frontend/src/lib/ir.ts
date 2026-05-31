import { z } from 'zod';
import { GRID_COLS, GRID_ROWS, type GridPlacement } from './grid';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const GridSpanSchema = z.number().int().positive();
export type GridSpan = z.infer<typeof GridSpanSchema>;

export const SpacingTokenSchema = z.number().int().nonnegative();
export type SpacingToken = z.infer<typeof SpacingTokenSchema>;

export const FitModeSchema = z.enum(['shrink-to-fit', 'clip', 'fill']);
export type FitMode = z.infer<typeof FitModeSchema>;

export const AlignSchema = z.enum(['start', 'center', 'end', 'stretch']);
export type Align = z.infer<typeof AlignSchema>;

export const JustifySchema = z.enum(['start', 'center', 'end', 'between']);
export type Justify = z.infer<typeof JustifySchema>;

export const LayoutTypeSchema = z.enum([
  'hero-number', 'split-compare', 'timeline',
  'icon-row', 'title', 'quote', 'data-focus', 'image-full',
]);
export type LayoutType = z.infer<typeof LayoutTypeSchema>;

// GridPlacement schema (mirrors grid.ts interface — inlined to avoid cross-file Zod deps)
export const GridPlacementSchema = z.object({
  col:     z.number(),
  row:     z.number(),
  colSpan: z.number(),
  rowSpan: z.number(),
});

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export const BrandTokensSchema = z.object({
  palette: z.array(z.string()),
  fontHeading: z.string(),
  fontBody: z.string(),
  spacingScale: z.array(z.number()),
  gridColumns: z.number().int().positive(),
});
export type BrandTokens = z.infer<typeof BrandTokensSchema>;

// ---------------------------------------------------------------------------
// Supporting leaf types
// ---------------------------------------------------------------------------

export const SourceRefSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const ImagePayloadSchema = z.object({
  url: z.string(),
  caption: z.string().optional(),
});
export type ImagePayload = z.infer<typeof ImagePayloadSchema>;

export const ChartSpecSchema = z.object({
  type: z.enum(['bar', 'line', 'pie', 'scatter', 'area']),
  data: z.record(z.unknown()),
  title: z.string().optional(),
});
export type ChartSpec = z.infer<typeof ChartSpecSchema>;

export const DiagramSpecSchema = z.object({
  kind: z.enum(['flowchart', 'architecture', 'sequence', 'mind-map']),
  definition: z.string(),
});
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;

// ---------------------------------------------------------------------------
// Content pool
// ---------------------------------------------------------------------------

export const TextPayloadSchema = z.object({
  role: z.enum(['claim', 'evidence', 'aside']),
  text: z.string(),
});
export type TextPayload = z.infer<typeof TextPayloadSchema>;

export const DataPayloadSchema = z.object({
  chart: ChartSpecSchema,
  source: SourceRefSchema.optional(),
});
export type DataPayload = z.infer<typeof DataPayloadSchema>;

// Fields shared by every ContentNode variant.
// sourceRef  — immutable origin: the scene that spawned this node (set by chunker).
// assignedSceneId — mutable assignment: the scene currently displaying this content
//                   (set by the user via drag-to-connect in the graph view).
// graphPosition   — canvas coordinates for the floating card.
const contentNodeBase = {
  sourceRef:       z.string().optional(),
  assignedSceneId: z.string().optional(),
  graphPosition:   z.object({ x: z.number(), y: z.number() }).optional(),
} as const;

// Discriminated on `kind` so payload type narrows automatically.
export const ContentNodeSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string(), kind: z.literal('text'),  payload: TextPayloadSchema,  ...contentNodeBase }),
  z.object({ id: z.string(), kind: z.literal('image'), payload: ImagePayloadSchema, ...contentNodeBase }),
  z.object({ id: z.string(), kind: z.literal('data'),  payload: DataPayloadSchema,  ...contentNodeBase }),
]);
export type ContentNode = z.infer<typeof ContentNodeSchema>;

// ---------------------------------------------------------------------------
// Style interfaces for user-authored blocks
// ---------------------------------------------------------------------------

export interface TextBlockStyle {
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  fontFamily?: 'sans' | 'mono' | 'serif';
  lineHeight?: number;
  letterSpacing?: string;
}

export interface ShapeBlockStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface ImageBlockStyle {
  objectFit?: 'cover' | 'contain';
}

// ---------------------------------------------------------------------------
// ContentBlock  (typed content in layout leaf nodes)
// ---------------------------------------------------------------------------

export const ContentBlockSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('claim'), text: z.string() }),
  z.object({ role: z.literal('evidence'), text: z.string(), source: SourceRefSchema.optional() }),
  z.object({ role: z.literal('visual'), asset: ImagePayloadSchema, caption: z.string().optional() }),
  z.object({ role: z.literal('data'), chart: ChartSpecSchema, source: SourceRefSchema.optional() }),
  z.object({ role: z.literal('figure'), diagram: DiagramSpecSchema }),
  z.object({ role: z.literal('aside'), text: z.string() }),
  // User-authored blocks (fully styled, positioned by GridPlacement)
  z.object({
    role: z.literal('text'),
    text: z.string(),
    style: z.object({
      fontSize: z.number(),
      fontWeight: z.number(),
      fontStyle: z.enum(['normal', 'italic']),
      textDecoration: z.enum(['none', 'underline']),
      textAlign: z.enum(['left', 'center', 'right']),
      color: z.string(),
      fontFamily: z.enum(['sans', 'mono', 'serif']).optional(),
      lineHeight: z.number().optional(),
      letterSpacing: z.string().optional(),
    }),
  }),
  z.object({
    role: z.literal('shape'),
    style: z.object({
      fill: z.string(),
      stroke: z.string(),
      strokeWidth: z.number(),
      borderRadius: z.number(),
    }),
  }),
  z.object({
    role: z.literal('image'),
    src: z.string(),
    style: z.object({ objectFit: z.enum(['cover', 'contain']).optional() }).optional(),
  }),
]);

export type ContentBlock =
  | { role: 'claim';    text: string }
  | { role: 'evidence'; text: string; source?: SourceRef }
  | { role: 'visual';   asset: ImagePayload; caption?: string }
  | { role: 'data';     chart: ChartSpec; source?: SourceRef }
  | { role: 'figure';   diagram: DiagramSpec }
  | { role: 'aside';    text: string }
  | { role: 'text';     text: string; style: TextBlockStyle }
  | { role: 'shape';    style: ShapeBlockStyle }
  | { role: 'image';    src: string; style?: ImageBlockStyle };

// ---------------------------------------------------------------------------
// LayoutNode  (recursive: stack contains children: LayoutNode[])
// ---------------------------------------------------------------------------

// Type declared explicitly to allow recursive reference.
export type LayoutNode =
  | {
      kind: 'stack';
      id: string;
      dir: 'row' | 'col';
      gap: SpacingToken;
      align?: Align;
      justify?: Justify;
      span?: GridSpan;
      children: LayoutNode[];
    }
  | {
      kind: 'leaf';
      id: string;
      block: ContentBlock;
      placement: GridPlacement;
      zIndex?: number;
      opacity?: number;
      rotation?: number;
      /** Back-reference to the ContentNode in the pool that this leaf was materialized from. */
      contentNodeId?: string;
    };

export type LeafNode  = Extract<LayoutNode, { kind: 'leaf' }>;
export type StackNode = Extract<LayoutNode, { kind: 'stack' }>;

// z.lazy defers evaluation so children: z.array(LayoutNodeSchema) resolves correctly.
export const LayoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.union([
    z.object({
      kind: z.literal('stack'),
      id: z.string(),
      dir: z.enum(['row', 'col']),
      gap: SpacingTokenSchema,
      align: AlignSchema.optional(),
      justify: JustifySchema.optional(),
      span: GridSpanSchema.optional(),
      children: z.array(LayoutNodeSchema),
    }),
    z.object({
      kind: z.literal('leaf'),
      id: z.string(),
      block: ContentBlockSchema,
      placement: GridPlacementSchema,
      zIndex: z.number().optional(),
      opacity: z.number().optional(),
      rotation: z.number().optional(),
      contentNodeId: z.string().optional(),
    }),
  ])
);

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

export const AssignmentEdgeSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  sceneId: z.string(),
  status: z.enum(['suggested', 'accepted']),
});
export type AssignmentEdge = z.infer<typeof AssignmentEdgeSchema>;

export const NarrativeEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  relation: z.enum(['supports', 'contrasts', 'builds-on', 'sequence']),
  status: z.enum(['suggested', 'accepted']),
});
export type NarrativeEdge = z.infer<typeof NarrativeEdgeSchema>;

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export const SceneSchema = z.object({
  id: z.string(),
  intent: z.string(),
  root: LayoutNodeSchema.optional(),
  cachedAt: z.string().optional(),
  spokenTrack: z.string().optional(),
  /** IDs of ContentNodes currently assigned to this scene. Derived from AssignmentEdge
   *  but also stored here for O(1) lookup without scanning the full assignments array. */
  assignedContentIds: z.array(z.string()).optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

// ---------------------------------------------------------------------------
// Category  (constraint bundle: tokens + density + floors + seed trees)
// ---------------------------------------------------------------------------

export const CategorySchema = z.object({
  id: z.string(),
  brand: BrandTokensSchema,
  allowedPrimitives: z.array(z.enum(['stack', 'leaf', 'layer'])),
  floors: z.object({
    minCellTracks: z.number().int().positive(),
    maxChildren: z.object({
      row: z.number().int().positive(),
      col: z.number().int().positive(),
    }),
  }),
  seedTrees: z.array(LayoutNodeSchema),
  density: z.enum(['tight', 'comfortable', 'airy']),
});
export type Category = z.infer<typeof CategorySchema>;

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export const SlideEditOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('splitColumn'), nodeId: z.string() }),
  z.object({ op: z.literal('wrapInRow'), nodeIds: z.array(z.string()) }),
  z.object({
    op: z.literal('reparent'),
    nodeId: z.string(),
    toParent: z.string(),
    index: z.number().int().nonnegative(),
  }),
  z.object({ op: z.literal('setSpan'), nodeId: z.string(), span: GridSpanSchema }),
  z.object({ op: z.literal('swap'), a: z.string(), b: z.string() }),
  z.object({
    op: z.literal('setAlign'),
    nodeId: z.string(),
    align: AlignSchema,
    justify: JustifySchema.optional(),
  }),
  z.object({
    op: z.literal('addLeaf'),
    parent: z.string(),
    leaf: LayoutNodeSchema,
    index: z.number().int().nonnegative(),
  }),
  z.object({ op: z.literal('removeLeaf'), nodeId: z.string() }),
  z.object({ op: z.literal('setPlacement'), nodeId: z.string(), placement: GridPlacementSchema }),
  z.object({ op: z.literal('setText'), nodeId: z.string(), text: z.string() }),
  z.object({
    op: z.literal('setStyle'),
    nodeId: z.string(),
    style: z.record(z.unknown()),
  }),
  z.object({ op: z.literal('setOpacity'),  nodeId: z.string(), opacity:  z.number() }),
  z.object({ op: z.literal('setRotation'), nodeId: z.string(), rotation: z.number() }),
  z.object({ op: z.literal('setZIndex'),   nodeId: z.string(), zIndex:   z.number() }),
  z.object({ op: z.literal('setImageSrc'), nodeId: z.string(), src:      z.string() }),
]);

export type SlideEditOp =
  | { op: 'splitColumn'; nodeId: string }
  | { op: 'wrapInRow';   nodeIds: string[] }
  | { op: 'reparent';    nodeId: string; toParent: string; index: number }
  | { op: 'setSpan';     nodeId: string; span: GridSpan }
  | { op: 'swap';        a: string; b: string }
  | { op: 'setAlign';    nodeId: string; align: Align; justify?: Justify }
  | { op: 'addLeaf';     parent: string; leaf: LeafNode; index: number }
  | { op: 'removeLeaf';  nodeId: string }
  | { op: 'setPlacement'; nodeId: string; placement: GridPlacement }
  | { op: 'setText';      nodeId: string; text: string }
  | { op: 'setStyle';     nodeId: string; style: Partial<TextBlockStyle & ShapeBlockStyle & ImageBlockStyle> }
  | { op: 'setOpacity';   nodeId: string; opacity: number }
  | { op: 'setRotation';  nodeId: string; rotation: number }
  | { op: 'setZIndex';    nodeId: string; zIndex: number }
  | { op: 'setImageSrc';  nodeId: string; src: string };

export const GraphOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('assignContent'), contentId: z.string(), sceneId: z.string() }),
  z.object({ op: z.literal('unassignContent'), assignmentId: z.string() }),
  z.object({ op: z.literal('acceptAssignment'), assignmentId: z.string() }),
  z.object({ op: z.literal('rejectAssignment'), assignmentId: z.string() }),
  z.object({ op: z.literal('addNarrativeEdge'), edge: NarrativeEdgeSchema.omit({ id: true }) }),
  z.object({ op: z.literal('removeNarrativeEdge'), edgeId: z.string() }),
  z.object({ op: z.literal('acceptNarrativeEdge'), edgeId: z.string() }),
  z.object({ op: z.literal('rejectNarrativeEdge'), edgeId: z.string() }),
  z.object({ op: z.literal('addContentNode'), node: ContentNodeSchema }),
  z.object({ op: z.literal('removeContentNode'), contentId: z.string() }),
  z.object({ op: z.literal('addScene'), scene: SceneSchema }),
  z.object({ op: z.literal('removeScene'), sceneId: z.string() }),
]);
export type GraphOp = z.infer<typeof GraphOpSchema>;

// ---------------------------------------------------------------------------
// Presentation  (root document)
// ---------------------------------------------------------------------------

export const PresentationSchema = z.object({
  id: z.string(),
  meta: z.object({
    title: z.string(),
    audience: z.string().optional(),
    durationTargetMin: z.number().int().positive().optional(),
  }),
  brand: BrandTokensSchema,
  contentPool: z.array(ContentNodeSchema),
  scenes: z.array(SceneSchema),
  assignments: z.array(AssignmentEdgeSchema),
  narrativeEdges: z.array(NarrativeEdgeSchema),
});
export type Presentation = z.infer<typeof PresentationSchema>;

// ---------------------------------------------------------------------------
// Tree utilities
// ---------------------------------------------------------------------------

function mapNode(root: LayoutNode, id: string, fn: (n: LayoutNode) => LayoutNode): LayoutNode {
  if (root.id === id) return fn(root);
  if (root.kind === 'stack') {
    return { ...root, children: root.children.map((c) => mapNode(c, id, fn)) };
  }
  return root;
}

export function applySlideEditOp(root: LayoutNode, op: SlideEditOp): LayoutNode {
  switch (op.op) {
    case 'setPlacement':
      return mapNode(root, op.nodeId, (n) => ({ ...n, placement: op.placement } as LayoutNode));
    case 'setText':
      return mapNode(root, op.nodeId, (n) =>
        n.kind === 'leaf' ? { ...n, block: { ...n.block, text: op.text } as ContentBlock } : n
      );
    case 'setStyle':
      return mapNode(root, op.nodeId, (n) =>
        n.kind === 'leaf'
          ? { ...n, block: { ...n.block, style: { ...(n.block as any).style, ...op.style } } as ContentBlock }
          : n
      );
    case 'setOpacity':
      return mapNode(root, op.nodeId, (n) => ({ ...n, opacity: op.opacity } as LayoutNode));
    case 'setRotation':
      return mapNode(root, op.nodeId, (n) => ({ ...n, rotation: op.rotation } as LayoutNode));
    case 'setZIndex':
      return mapNode(root, op.nodeId, (n) => ({ ...n, zIndex: op.zIndex } as LayoutNode));
    case 'setImageSrc':
      return mapNode(root, op.nodeId, (n) =>
        n.kind === 'leaf' ? { ...n, block: { ...n.block, src: op.src } as ContentBlock } : n
      );
    case 'addLeaf': {
      return mapNode(root, op.parent, (n) => {
        if (n.kind !== 'stack') return n;
        const children = [...n.children];
        children.splice(op.index, 0, op.leaf);
        return { ...n, children };
      });
    }
    case 'removeLeaf': {
      const removeFromTree = (node: LayoutNode): LayoutNode => {
        if (node.kind === 'leaf') return node;
        return {
          ...node,
          children: node.children
            .filter((c) => c.id !== op.nodeId)
            .map(removeFromTree),
        };
      };
      return removeFromTree(root);
    }
    case 'setSpan':
      return mapNode(root, op.nodeId, (n) => ({ ...n, span: op.span } as LayoutNode));
    case 'swap': {
      let nodeA: LayoutNode | null = null;
      let nodeB: LayoutNode | null = null;
      const findNodes = (n: LayoutNode) => {
        if (n.id === op.a) nodeA = n;
        if (n.id === op.b) nodeB = n;
        if (n.kind === 'stack') n.children.forEach(findNodes);
      };
      findNodes(root);
      if (!nodeA || !nodeB) return root;
      const a = nodeA as LayoutNode;
      const b = nodeB as LayoutNode;
      return mapNode(
        mapNode(root, op.a, () => ({ ...b, id: op.a } as LayoutNode)),
        op.b,
        () => ({ ...a, id: op.b } as LayoutNode)
      );
    }
    default:
      return root;
  }
}

export function collectLeaves(root: LayoutNode): LeafNode[] {
  if (root.kind === 'leaf') return [root];
  return root.children.flatMap(collectLeaves);
}

export function emptyRoot(id: string): StackNode {
  return { kind: 'stack', id: `root-${id}`, dir: 'col', gap: 0, children: [] };
}

// ---------------------------------------------------------------------------
// Content-node → slide materialization
// Converts the assigned ContentNodes for a scene into a flat LayoutNode tree
// that the slide renderer can display. This is the "IR as source of truth"
// rendering path: the EditorView calls this whenever it enters a slide that
// has content assigned, so the layout is always derived from the pool.
// ---------------------------------------------------------------------------

// Placement constants relative to the 10 000 × 5 625 grid (see grid.ts).
const MAT_COL_START = Math.round(GRID_COLS * 0.06);   // ~600  — 6% left margin
const MAT_COL_SPAN  = Math.round(GRID_COLS * 0.88);   // ~8800 — 88% width
const MAT_ROW_START = Math.round(GRID_ROWS * 0.07);   // ~394  — 7% top margin
const MAT_ROW_TOTAL = Math.round(GRID_ROWS * 0.85);   // ~4781 — usable height
const MAT_ROW_GAP   = Math.round(GRID_ROWS * 0.025);  // ~140  — gap between items

function contentNodeToLeaf(cn: ContentNode, placement: GridPlacement): LeafNode {
  if (cn.kind === 'image') {
    return {
      kind: 'leaf',
      id: makeLeafId(),
      contentNodeId: cn.id,
      placement,
      block: { role: 'image', src: cn.payload.url },
      zIndex: 1,
      opacity: 1,
      rotation: 0,
    };
  }
  const payload = cn.payload as TextPayload;
  const styleMap: Record<TextPayload['role'], Partial<TextBlockStyle>> = {
    claim:    { fontSize: 72, fontWeight: 700, lineHeight: 1.1 },
    evidence: { fontSize: 32, fontWeight: 400, lineHeight: 1.4 },
    aside:    { fontSize: 28, fontWeight: 400, fontStyle: 'italic', lineHeight: 1.4 },
  };
  const style: TextBlockStyle = {
    fontSize: 32,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: 'oklch(0.24 0.009 185)',
    lineHeight: 1.3,
    ...styleMap[payload.role],
  };
  return {
    kind: 'leaf',
    id: makeLeafId(),
    contentNodeId: cn.id,
    placement,
    block: { role: 'text', text: payload.text, style },
    zIndex: 1,
    opacity: 1,
    rotation: 0,
  };
}

export function materializeContentNodes(
  contentNodes: ContentNode[],
  sceneId: string,
): StackNode {
  const n = contentNodes.length;
  const totalGap = MAT_ROW_GAP * Math.max(0, n - 1);
  const rowPerItem = n > 0 ? Math.floor((MAT_ROW_TOTAL - totalGap) / n) : MAT_ROW_TOTAL;

  const leaves = contentNodes.map((cn, i): LeafNode => {
    const row = MAT_ROW_START + i * (rowPerItem + MAT_ROW_GAP);
    return contentNodeToLeaf(cn, {
      col: MAT_COL_START,
      row,
      colSpan: MAT_COL_SPAN,
      rowSpan: rowPerItem,
    });
  });

  return {
    kind: 'stack',
    id: `root-${sceneId}`,
    dir: 'col',
    gap: 0,
    children: leaves,
  };
}

export function deepCloneWithNewIds(root: LayoutNode): LayoutNode {
  const newId = `${root.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (root.kind === 'leaf') return { ...root, id: newId };
  return { ...root, id: newId, children: root.children.map(deepCloneWithNewIds) };
}

let _leafId = 1;
export function makeLeafId(): string {
  return `leaf-${Date.now()}-${_leafId++}`;
}

export function makeTextLeaf(overrides?: Partial<LeafNode>): LeafNode {
  return {
    kind: 'leaf',
    id: makeLeafId(),
    placement: { col: 2500, row: 1500, colSpan: 4000, rowSpan: 1500 },
    block: {
      role: 'text',
      text: 'Click to edit',
      style: {
        fontSize: 28,
        fontWeight: 400,
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: 'oklch(0.24 0.009 185)',
      },
    },
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    ...overrides,
  };
}

export function makeShapeLeaf(overrides?: Partial<LeafNode>): LeafNode {
  return {
    kind: 'leaf',
    id: makeLeafId(),
    placement: { col: 2500, row: 1500, colSpan: 4000, rowSpan: 1500 },
    block: {
      role: 'shape',
      style: {
        fill: 'oklch(0.54 0.105 192)',
        stroke: 'transparent',
        strokeWidth: 0,
        borderRadius: 6,
      },
    },
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    ...overrides,
  };
}

export function makeImageLeaf(overrides?: Partial<LeafNode>): LeafNode {
  return {
    kind: 'leaf',
    id: makeLeafId(),
    placement: { col: 2500, row: 1500, colSpan: 4000, rowSpan: 2250 },
    block: { role: 'image', src: '' },
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    ...overrides,
  };
}
