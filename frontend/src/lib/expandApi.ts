// ── Graph expansion server function ───────────────────────────────────────────
//
// expandNode is a TanStack Start server function. At build time the router
// plugin splits it: the client gets an HTTP stub, the server gets the real
// handler + Gemini SDK. GEMINI_API_KEY never reaches the browser.
//
// EXPANSION AGENT swap point: to change the model or provider, edit:
//   backend/landing-page/geminiClient.ts → getExpansionModel()
//   backend/landing-page/expandAgent.ts  → callExpansionAgent()

import { createServerFn } from "@tanstack/react-start";
import { handleExpandRequest } from "@backend/landing-page/expandHandler";
import type { ExpandResponse } from "@backend/landing-page/expandSchema";
import type { ExpandRequest } from "@backend/landing-page/expandSchema";

export const expandNode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input as ExpandRequest)
  .handler(({ data }): Promise<ExpandResponse> => handleExpandRequest(data));
