#!/usr/bin/env node
// Standalone Gemini key + chunking test.
// Tests: key loads → SDK connects → Gemini responds → JSON parses → schema validates.
// Does NOT require the frontend or TanStack Start to be running.
//
// Run from the project root:
//   node backend/test-gemini-key.mjs
//
// Or with a one-off key override:
//   GEMINI_API_KEY=AIza... node backend/test-gemini-key.mjs

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../frontend/.env");

// ── 1. Load the key ──────────────────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && val) process.env[key] = val;
    }
    console.log(`✓  Loaded env from ${envPath}`);
  } else {
    console.warn(`⚠  ${envPath} not found — using process environment only`);
  }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌  GEMINI_API_KEY is not set.");
  console.error("    Create frontend/.env with:  GEMINI_API_KEY=your_key_here");
  process.exit(1);
}
console.log(`✓  Key loaded  (${apiKey.length} chars, starts with ${apiKey.slice(0, 4)}…)`);

// ── 2. Import SDK from frontend node_modules ─────────────────────────────────
const sdkPath = resolve(__dirname, "../frontend/node_modules/@google/generative-ai");
if (!existsSync(sdkPath)) {
  console.error("❌  @google/generative-ai not found in frontend/node_modules.");
  console.error("    Run:  cd frontend && npm install");
  process.exit(1);
}
// Use pathToFileURL so Windows absolute paths work with ESM dynamic import
const sdkMjs = pathToFileURL(resolve(sdkPath, "dist/index.mjs")).href;
const sdkJs  = pathToFileURL(resolve(sdkPath, "dist/index.js")).href;
const { GoogleGenerativeAI } = await import(sdkMjs).catch(() => import(sdkJs));
console.log("✓  SDK imported");

// ── 3. Call Gemini ───────────────────────────────────────────────────────────
const SAMPLE_TEXT =
  "We're building Projektor — an AI-powered presentation editor. " +
  "Users paste rough notes, the AI structures them into slides with layout and design. " +
  "Key insight: teams spend 40% of meeting-prep time fighting slide tools, not thinking about the argument. " +
  "Our target is B2B teams doing investor decks, board updates, and sales pitches.";

console.log("\n── Calling Gemini (gemini-2.5-flash, JSON mode, 3 slides) …");

const genai = new GoogleGenerativeAI(apiKey);
const model = genai.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const prompt =
  `Chunk the following brain-dump into exactly 3 slides. ` +
  `Return a JSON array where each item has: headline (string), body (string), ` +
  `kind ("title"|"problem"|"data"), eyebrow (optional string).\n\n${SAMPLE_TEXT}`;

let raw;
try {
  const result = await model.generateContent(prompt);
  raw = result.response.text();
  console.log("✓  Gemini responded");
} catch (err) {
  console.error("❌  Gemini API call failed:", err.message ?? err);
  if (err.message?.includes("API_KEY_INVALID"))
    console.error("    Your key is invalid. Get a fresh one at https://aistudio.google.com/");
  if (err.message?.includes("QUOTA"))
    console.error("    Quota exceeded. Wait or check your Google Cloud billing.");
  process.exit(1);
}

// ── 4. Parse JSON ────────────────────────────────────────────────────────────
let parsed;
try {
  parsed = JSON.parse(raw);
  console.log("✓  JSON parsed");
} catch {
  console.error("❌  Gemini returned non-JSON:");
  console.error(raw.slice(0, 500));
  process.exit(1);
}

// ── 5. Validate shape ────────────────────────────────────────────────────────
if (!Array.isArray(parsed) || parsed.length === 0) {
  console.error("❌  Expected a non-empty JSON array. Got:", JSON.stringify(parsed).slice(0, 200));
  process.exit(1);
}
const required = ["headline", "body", "kind"];
for (const [i, chunk] of parsed.entries()) {
  for (const field of required) {
    if (!chunk[field]) {
      console.error(`❌  Chunk ${i} is missing field "${field}":`, chunk);
      process.exit(1);
    }
  }
}
console.log("✓  Schema valid\n");

// ── 6. Print results ─────────────────────────────────────────────────────────
console.log("── Result (" + parsed.length + " chunks) ──────────────────────────────────");
for (const [i, chunk] of parsed.entries()) {
  console.log(`\n[${i + 1}] ${chunk.kind.toUpperCase()}${chunk.eyebrow ? " · " + chunk.eyebrow : ""}`);
  console.log(`    Headline: ${chunk.headline}`);
  console.log(`    Body:     ${chunk.body.slice(0, 120).replace(/\n/g, " ")}${chunk.body.length > 120 ? "…" : ""}`);
}

console.log("\n✅  Full chain works: key → Gemini → JSON → validated output");
console.log("   Your GEMINI_API_KEY is good. The frontend will use real generation.\n");
