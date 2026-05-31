// ── Why this file exists ───────────────────────────────────────────────────────
//
// All backend logic lives under backend/landing-page/ (outside the frontend/
// directory tree), but the npm packages it needs (@google/generative-ai, zod)
// are installed in frontend/node_modules/.
//
// When Node.js resolves a bare module specifier (e.g. import { z } from "zod"),
// it walks UP the directory tree from the importing file:
//
//   backend/landing-page/node_modules/zod  ← doesn't exist
//   backend/node_modules/zod               ← doesn't exist (no package.json here)
//   <project-root>/node_modules/zod        ← doesn't exist (no root package.json)
//   ... keeps walking, never finds it → ERR_MODULE_NOT_FOUND
//
// TanStack Start's SSR module runner externalizes node_modules packages and lets
// Node do native resolution, so ssr.noExternal / Vite plugin tricks don't help.
//
// The fix: import the packages HERE, from a file that IS inside frontend/src/.
// Node's upward walk from frontend/src/server/ hits frontend/node_modules/ and
// succeeds. Backend files import these re-exports via the @/ path alias:
//
//   import { z } from "@/server/geminiShim";
//   // vite-tsconfig-paths rewrites @/ → frontend/src/
//   // → resolves to frontend/src/server/geminiShim.ts  (absolute, not bare)
//   // → Vite loads this file; its own imports resolve from frontend/node_modules/
//
// If a new backend file needs another npm package, add a re-export line here
// and update that file's import to use "@/server/geminiShim".

export { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
export type { Schema } from "@google/generative-ai";

export { z } from "zod";
export type { ZodTypeAny, ZodSchema } from "zod";
