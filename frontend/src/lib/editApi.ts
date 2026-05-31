// ── Node edit server function ───────────────────────────────────────────────────
// editNode is a TanStack Start server function. The router plugin splits it: the
// client gets an HTTP stub, the server gets the real handler + Gemini SDK, so
// GEMINI_API_KEY never reaches the browser. Mirrors expandApi.ts.
//
// EDIT AGENT swap point: to change the model/provider, edit
//   backend/landing-page/geminiClient.ts → getEditModel()
//   backend/landing-page/editAgent.ts    → callEditAgent()

import { createServerFn } from "@tanstack/react-start";
import { handleEditRequest } from "@backend/landing-page/editHandler";
import type { EditRequest, EditResponse } from "@backend/landing-page/editSchema";

export const editNode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input as EditRequest)
  .handler(({ data }): Promise<EditResponse> => handleEditRequest(data));
