import { z } from "@/server/geminiShim";

export const ExpandResultSchema = z.object({
  headline: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  kind: z.enum(["title", "problem", "data"]),
  eyebrow: z.string().max(60).optional(),
  rationale: z.string().max(300).optional(),
});

export const ExpandResponseSchema = z.object({
  expansions: z.array(ExpandResultSchema).min(1).max(4),
});

export const ExpandRequestSchema = z.object({
  parent: z.object({
    headline: z.string().min(1).max(120),
    body: z.string().max(2000),
    kind: z.enum(["title", "problem", "data"]),
    eyebrow: z.string().max(60).optional(),
  }),
  deckTitle: z.string().max(120),
  existingTitles: z.array(z.string().max(120)).max(30),
});

export type ExpandResult = z.infer<typeof ExpandResultSchema>;
export type ExpandRequest = z.infer<typeof ExpandRequestSchema>;
export type ExpandResponse = z.infer<typeof ExpandResponseSchema>;
