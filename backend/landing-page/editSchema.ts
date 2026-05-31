// ── Edit-agent schemas ─────────────────────────────────────────────────────────
// The edit agent BUILDS content-component nodes for ONE graph node (content box).
// Each op describes a ContentNode to create (text / image / data-chart). On Accept
// the client instantiates them in the global contentPool, attached to the box via
// `sourceRef`. Ops use a FLAT shape (kind + optional per-kind fields) because
// Gemini's responseSchema cannot express discriminated unions — the client narrows
// each op by its `kind` field when building the ContentNode (mirrors ir.ts).
import { z } from "@/server/geminiShim";

// ContentNode kinds the agent may build (mirrors ir.ts ContentNode.kind).
export const CONTENT_KINDS = ["text", "image", "data"] as const;
// Text roles (mirrors ir.ts TextPayload.role).
export const TEXT_ROLES = ["claim", "evidence", "aside"] as const;
// Chart types (mirrors ir.ts ChartSpec.type).
export const CHART_TYPES = ["bar", "line", "pie", "scatter", "area"] as const;

export const EditOpSchema = z.object({
  // Which content component (ContentNode) to build.
  kind: z.enum(CONTENT_KINDS),
  // kind=text → a claim / evidence / aside line.
  role: z.enum(TEXT_ROLES).optional(),
  text: z.string().max(1500).optional(),
  // kind=image → reference an availableImages id (resolved to a URL on the client);
  // never invent a URL. This is the swap point for AI image generation.
  imageRef: z.string().max(120).optional(),
  caption: z.string().max(200).optional(),
  // kind=data → a small chart spec.
  chartType: z.enum(CHART_TYPES).optional(),
  chartTitle: z.string().max(120).optional(),
  chartData: z
    .array(z.object({ label: z.string().max(80), value: z.number() }))
    .max(12)
    .optional(),
});

export const EditResponseSchema = z.object({
  summary: z.string().min(1).max(400),
  ops: z.array(EditOpSchema).max(8),
});

export const EditRequestSchema = z.object({
  instruction: z.string().min(1).max(2000),
  node: z.object({
    title: z.string().max(200),
    body: z.string().max(2000).optional(),
    eyebrow: z.string().max(120).optional(),
    kind: z.string().max(40),
  }),
  availableImages: z.array(z.object({ id: z.string(), name: z.string() })).max(30),
});

export type EditOp = z.infer<typeof EditOpSchema>;
export type EditResponse = z.infer<typeof EditResponseSchema>;
export type EditRequest = z.infer<typeof EditRequestSchema>;
