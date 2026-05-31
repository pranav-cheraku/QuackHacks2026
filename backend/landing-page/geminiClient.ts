// ── Gemini SDK client ─────────────────────────────────────────────────────────
//
// This module is imported ONLY by chunkingAgent.ts, which is imported only by
// proxyHandler.ts, which is imported only by chunkApi.ts (a createServerFn).
// The entire import chain is server-side — the Gemini SDK and API key never
// reach the browser bundle.
//
// GEMINI_API_KEY is read from process.env at runtime (Node.js only).
// It is set in frontend/.env and loaded by Vite's dotenv integration into
// process.env for server functions. It is NOT prefixed with VITE_ so it is
// never injected into import.meta.env / the client bundle.
//
// ── Module resolution note ────────────────────────────────────────────────────
// This file imports from "@/server/geminiShim" rather than directly from
// "@google/generative-ai". See frontend/src/server/geminiShim.ts for the full
// explanation. Short version: backend/ has no node_modules, so bare specifiers
// like "@google/generative-ai" can't be resolved by Node from here. The shim
// re-exports the same symbols from inside frontend/src/, where node_modules IS
// reachable via Node's upward directory search.

import { GoogleGenerativeAI, SchemaType } from "@/server/geminiShim";
import type { Schema } from "@/server/geminiShim";

// Singleton client — constructed once per server process on first request.
// Re-using the same instance avoids repeated key reads and SDK initialisation.
let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("[GEMINI_KEY_MISSING] GEMINI_API_KEY is not set — add it to frontend/.env");
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

// ── Response schema ───────────────────────────────────────────────────────────
// Passed to Gemini's generationConfig.responseSchema. This tells Gemini to
// return ONLY a JSON array of objects matching this shape — no prose, no
// markdown fences. The SDK enforces the shape server-side before we even see
// the response, so ChunksResponseSchema.parse() in chunkingAgent.ts is a
// belt-and-suspenders check rather than the primary guard.
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

// System instruction sent with every request. Gemini treats this as a
// persistent context that shapes all output — equivalent to a system prompt.
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

// ── MODEL SWAP POINT ──────────────────────────────────────────────────────────
// To change the model: update the `model` string below.
// To add safety settings, temperature, topK, etc: add to generationConfig.
// The responseSchema pins Gemini to the exact shape chunkingAgent.ts expects.
export function getChunkingModel() {
  return getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",  // forces JSON output mode
      responseSchema: CHUNKING_RESPONSE_SCHEMA,
    },
  });
}

// ── Expansion response schema ─────────────────────────────────────────────────
// Used by expandAgent.ts. Gemini returns an object with an "expansions" array
// so the model can produce multiple candidate next-slides in one call.
export const EXPANSION_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    expansions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          headline: { type: SchemaType.STRING, description: "Punchy slide title, max 10 words" },
          body: {
            type: SchemaType.STRING,
            description: "Supporting content: 2-4 sentences OR 3-5 bullet points prefixed with • ",
          },
          kind: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["title", "problem", "data"],
            description: "title = opening/closing; problem = challenge/need; data = evidence/solution",
          },
          eyebrow: {
            type: SchemaType.STRING,
            description: "Optional ALL CAPS section label, max 4 words",
          },
          rationale: {
            type: SchemaType.STRING,
            description: "One sentence on why this slide comes next in the narrative",
          },
        },
        required: ["headline", "body", "kind"],
      },
    },
  },
  required: ["expansions"],
};

const EXPANSION_SYSTEM_INSTRUCTION = `You are a presentation architect. Given a slide and its deck context, generate exactly 2 compelling next-slide options that could follow it.

Rules:
- Each expansion must carry exactly ONE clear idea that logically follows the parent slide
- Headlines: punchy, max 8 words, skip articles where possible
- Body: 2-4 sentences OR 3-5 bullet points prefixed with "• "
- Kind mapping: "title" = theme/closing, "problem" = challenge/gap/need, "data" = evidence/metric/solution/feature
- Eyebrow: sparingly, ALL CAPS, ≤4 words — section transitions only
- Rationale: one sentence explaining the narrative logic
- Do NOT repeat any existing slide title from the deck
- Always return exactly 2 expansions in the array
- Return ONLY the JSON object. No prose, no markdown fences.`;

// ── EXPANSION MODEL SWAP POINT ────────────────────────────────────────────────
// To change the model: update the `model` string below.
export function getExpansionModel() {
  return getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: EXPANSION_SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: EXPANSION_RESPONSE_SCHEMA,
    },
  });
}
