// ── Gemini expansion agent ─────────────────────────────────────────────────────
//
// callExpansionAgent takes one parent slide's content + deck context and asks
// Gemini for exactly 2 candidate next-slides with real populated content.
//
// EXPANSION AGENT: input = box content + deck context → output = populated child
// boxes; inserted via the existing extend mechanism in BoardView.generateOptions.
//
// Error labels follow the same convention as chunkingAgent.ts:
//   [GEMINI_API_ERROR]    — HTTP/SDK call failed
//   [GEMINI_PARSE_ERROR]  — non-JSON response
//   [GEMINI_SCHEMA_ERROR] — JSON failed ExpandResponseSchema validation

import { getExpansionModel } from "./geminiClient";
import { ExpandResponseSchema, type ExpandRequest, type ExpandResponse } from "./expandSchema";

function buildPrompt(req: ExpandRequest): string {
  const existing = req.existingTitles.length > 0
    ? `\nExisting slides (do not repeat): ${req.existingTitles.map((t) => `"${t}"`).join(", ")}`
    : "";
  return `Deck title: "${req.deckTitle}"${existing}

Parent slide:
  Headline: "${req.parent.headline}"
  Body: "${req.parent.body}"
  Kind: ${req.parent.kind}${req.parent.eyebrow ? `\n  Eyebrow: "${req.parent.eyebrow}"` : ""}

Generate exactly 2 compelling next-slide options that logically follow this parent slide.`;
}

async function attemptExpand(req: ExpandRequest): Promise<ExpandResponse> {
  const model = getExpansionModel();

  let raw: string;
  try {
    const result = await model.generateContent(buildPrompt(req));
    raw = result.response.text();
  } catch (err) {
    throw new Error(
      `[GEMINI_API_ERROR] Expansion API call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[GEMINI_PARSE_ERROR] Gemini returned non-JSON: ${raw.slice(0, 300)}`);
  }

  try {
    return ExpandResponseSchema.parse(parsed);
  } catch (err) {
    throw new Error(
      `[GEMINI_SCHEMA_ERROR] Expansion output failed validation: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function callExpansionAgent(req: ExpandRequest): Promise<ExpandResponse> {
  try {
    return await attemptExpand(req);
  } catch (firstErr) {
    const label = firstErr instanceof Error ? firstErr.message.split("]")[0] + "]" : "[UNKNOWN]";
    console.warn(`[expandAgent] First attempt failed (${label}), retrying once…`);
    try {
      return await attemptExpand(req);
    } catch (retryErr) {
      console.error("[expandAgent] Both attempts failed:", retryErr);
      throw new Error(
        retryErr instanceof Error ? retryErr.message : `[GEMINI_ERROR] ${String(retryErr)}`,
      );
    }
  }
}
