import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;
let _keyChecked = false;

// Call once on server startup (or on first request) to confirm key presence.
// Logs status without printing the key value.
export function verifyGeminiKey(): void {
  if (_keyChecked) return;
  _keyChecked = true;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error(
      "[projektor] ❌ GEMINI_API_KEY is not set.\n" +
      "  Add it to frontend/.env: GEMINI_API_KEY=your_key_here\n" +
      "  The chunking agent will fall back to mock output until the key is present.",
    );
  } else {
    console.log(
      `[projektor] ✓ Gemini key loaded (${key.length} chars, starts with ${key.slice(0, 4)}…)`,
    );
  }
}

function getClient(): GoogleGenerativeAI {
  if (_client) return _client;
  verifyGeminiKey();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("[GEMINI_KEY_MISSING] GEMINI_API_KEY is not set — add it to frontend/.env");
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

// JSON response schema — mirrors ChunkResult exactly
export const CHUNKING_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      headline: {
        type: SchemaType.STRING,
        description: "Punchy slide title, max 10 words",
      },
      body: {
        type: SchemaType.STRING,
        description:
          "Supporting content: 2-4 sentences OR 3-5 bullet points prefixed with • ",
      },
      kind: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["title", "problem", "data"],
        description:
          "title = opening/closing/theme; problem = challenge/gap/need; data = evidence/metric/solution",
      },
      eyebrow: {
        type: SchemaType.STRING,
        description:
          "Optional ALL CAPS section label, max 4 words (e.g. THE PROBLEM, OUR SOLUTION)",
      },
    },
    required: ["headline", "body", "kind"],
  },
};

const SYSTEM_INSTRUCTION = `You are a presentation architect. Structure raw text into a precise, compelling slide outline.

Semantic chunking rules:
- Group related ideas into cohesive narrative BEATS — not just paragraph boundaries
- Each slide must carry exactly ONE clear idea
- Headlines: punchy, max 8 words, skip articles where possible
- Body: 2-4 sentences OR 3-5 bullet points prefixed with "• " (choose whichever fits)
- Kind mapping:
  • "title" — opening slides, closing slides, thematic statements
  • "problem" — challenges, gaps, pain points, user needs
  • "data" — evidence, metrics, solutions, features, next steps
- Eyebrow: sparingly, ALL CAPS, ≤4 words — use for section transitions only
- Return ONLY the JSON array. No prose, no markdown fences.`;

export function getChunkingModel() {
  return getClient().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CHUNKING_RESPONSE_SCHEMA,
    },
  });
}
