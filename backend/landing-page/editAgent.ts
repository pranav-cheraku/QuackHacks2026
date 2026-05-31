// ── Gemini edit agent ──────────────────────────────────────────────────────────
// callEditAgent takes ONE node's content + the user's instruction and asks Gemini
// for a proposal: a list of content-block ops (add/update/remove). The frontend
// renders the proposal for Accept/Discard and applies the ops to the node.
//
// EDIT AGENT swap point: the model lives in geminiClient.getEditModel().
// Error labels match chunkingAgent.ts / expandAgent.ts:
//   [GEMINI_API_ERROR] / [GEMINI_PARSE_ERROR] / [GEMINI_SCHEMA_ERROR]
// On total failure the backend throws — the ChatTab catches and falls back to a
// deterministic mock proposal (same split-of-responsibility as the chunker).
import { getEditModel } from "./geminiClient";
import { EditResponseSchema, type EditRequest, type EditResponse } from "./editSchema";

function buildPrompt(req: EditRequest): string {
  const blocks = req.node.blocks.length
    ? req.node.blocks.map((b) => `  - [${b.id}] ${b.type}: "${b.text ?? b.label}"`).join("\n")
    : "  (none yet)";
  const images = req.availableImages.length
    ? req.availableImages.map((i) => `  - ${i.id}: "${i.name}"`).join("\n")
    : "  (none uploaded)";
  return `Content box (graph node):
  Title: "${req.node.title}"
  Kind: ${req.node.kind}${req.node.eyebrow ? `\n  Eyebrow: "${req.node.eyebrow}"` : ""}${req.node.body ? `\n  Body: "${req.node.body}"` : ""}

Existing content blocks:
${blocks}

Available uploaded images (reference by id only):
${images}

User request: "${req.instruction}"

Propose concrete content-block edits to fulfill the request.`;
}

async function attemptEdit(req: EditRequest): Promise<EditResponse> {
  const model = getEditModel();

  let raw: string;
  try {
    const result = await model.generateContent(buildPrompt(req));
    raw = result.response.text();
  } catch (err) {
    throw new Error(
      `[GEMINI_API_ERROR] Edit API call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[GEMINI_PARSE_ERROR] Gemini returned non-JSON: ${raw.slice(0, 300)}`);
  }

  try {
    return EditResponseSchema.parse(parsed);
  } catch (err) {
    throw new Error(
      `[GEMINI_SCHEMA_ERROR] Edit output failed validation: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function callEditAgent(req: EditRequest): Promise<EditResponse> {
  try {
    return await attemptEdit(req);
  } catch (firstErr) {
    const label = firstErr instanceof Error ? firstErr.message.split("]")[0] + "]" : "[UNKNOWN]";
    console.warn(`[editAgent] First attempt failed (${label}), retrying once…`);
    try {
      return await attemptEdit(req);
    } catch (retryErr) {
      console.error("[editAgent] Both attempts failed:", retryErr);
      throw new Error(
        retryErr instanceof Error ? retryErr.message : `[GEMINI_ERROR] ${String(retryErr)}`,
      );
    }
  }
}
