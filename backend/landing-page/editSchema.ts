// ── Edit-agent schemas ─────────────────────────────────────────────────────────
// Mirrors expandSchema.ts. The agent proposes content-block edits for ONE graph
// node (content box). Ops use a FLAT shape (op + optional fields) rather than a
// discriminated union, because Gemini's responseSchema does not support unions —
// the frontend narrows each op by its `op` field when applying it.
import { z } from "@/server/geminiShim";

// Block types the agent may add. (Video/Chart exist in the app but the agent
// sticks to text blocks + Image for now.)
export const EDIT_BLOCK_TYPES = [
  "Header",
  "Subheader",
  "Body",
  "List",
  "Stat",
  "Quote",
  "Image",
] as const;

export const EditOpSchema = z.object({
  op: z.enum(["addBlock", "updateBlock", "removeBlock"]),
  // addBlock: blockType + label + (text for text blocks | imageRef for an Image)
  blockType: z.enum(EDIT_BLOCK_TYPES).optional(),
  label: z.string().max(80).optional(),
  text: z.string().max(1500).optional(),
  // imageRef = an availableImages id; resolved to a real URL on the client.
  // This is the swap point for AI image generation (would become a prompt).
  imageRef: z.string().max(120).optional(),
  // updateBlock / removeBlock: target an existing block by id.
  blockId: z.string().max(120).optional(),
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
    blocks: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          label: z.string(),
          text: z.string().optional(),
        }),
      )
      .max(40),
  }),
  availableImages: z.array(z.object({ id: z.string(), name: z.string() })).max(30),
});

export type EditOp = z.infer<typeof EditOpSchema>;
export type EditResponse = z.infer<typeof EditResponseSchema>;
export type EditRequest = z.infer<typeof EditRequestSchema>;
