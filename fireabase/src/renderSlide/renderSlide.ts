import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Schema } from "@google/generative-ai";
import { slideSpecSchema } from "./slideSpecSchema";

const geminiKey = defineSecret("GEMINI_API_KEY");

export const renderSlide = onCall(
  { secrets: [geminiKey], timeoutSeconds: 60, memory: "512MiB" },
  async (request) => {
    const { components, deckContext, slideContent } = request.data;

    if (!components || !deckContext) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const genAI = new GoogleGenerativeAI(geminiKey.value());

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: slideSpecSchema as Schema,
      },
    });

    const prompt = buildPrompt(components, deckContext, slideContent);
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let spec;
    try {
      spec = JSON.parse(raw);
    } catch {
      throw new HttpsError("internal", "Gemini returned invalid JSON");
    }

    const repaired = validateAndRepair(spec, components);
    return { spec: repaired };
  }
);

// -- Prompt builder ----------------------------------------------------------

function buildPrompt(
  components: string[],
  deckContext: { topic: string; palette: string[]; fontFamily: string },
  slideContent: Record<string, unknown>
): string {
  return `
You are a slide layout engine for a presentation software tool.

Given a list of content components and deck context, produce a SlideSpec JSON object.

RULES:
- All positions and sizes are percentage units (0–100). The slide is 16:9 aspect ratio.
- No element may overflow: x + w <= 100, y + h <= 100.
- Elements must not overlap unless one is a background shape.
- Use ONLY colors from the provided palette.
- Font sizes: headers 48–72, subheaders 28–36, body 18–22, stats 64–96, byline 14–16.
- Choose the layout field based on the component mix:
    "centered" for title-only or hero slides
    "split-left" or "split-right" when mixing text + image
    "grid-2" or "grid-3" for multiple stats or list groups
    "full-bleed" for image-dominant slides

DECK CONTEXT:
Topic: ${deckContext.topic}
Palette: ${deckContext.palette.join(", ")}
Font: ${deckContext.fontFamily}

COMPONENTS REQUESTED: ${components.join(", ")}

EXISTING CONTENT (use this text verbatim where provided):
${JSON.stringify(slideContent, null, 2)}
  `.trim();
}

// -- Validation + geometry repair --------------------------------------------

function validateAndRepair(spec: any, requestedComponents: string[]): any {
  if (!spec.id) spec.id = crypto.randomUUID();

  if (!spec.elements || !Array.isArray(spec.elements)) {
    throw new HttpsError("internal", "Spec missing elements array");
  }

  for (const el of spec.elements) {
    el.size.w = clamp(el.size.w, 5, 100);
    el.size.h = clamp(el.size.h, 3, 100);
    el.position.x = clamp(el.position.x, 0, 100 - el.size.w);
    el.position.y = clamp(el.position.y, 0, 100 - el.size.h);
    el.zIndex = el.zIndex ?? 1;
  }

  const producedTypes = new Set(spec.elements.map((el: any) => el.type));
  for (const component of requestedComponents) {
    if (!producedTypes.has(component)) {
      console.warn(`renderSlide: requested component "${component}" missing from spec`);
    }
  }

  return spec;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}