# Projektor — Change Log

All significant changes made to the project, newest first.

---

## 2026-05-31

### Logo update
- Replaced the placeholder `Shapes` icon in `Logo.tsx` with the real Projektor logo PNG (`frontend/src/assets/logo.png`)
- `Logo` component now renders an `<img>` tag instead of a lucide icon inside a coloured square

### Landing page — remove duration picker and brand URL
- Removed the 5 / 10 / 20 min target duration selector from the landing page UI
- Removed the brand/company URL input field
- `hydrateToSlides()` in `chunker.ts` no longer takes a `duration` parameter — slide target count is now fixed at 10 (the former 10-min default)
- `TargetDuration` type and `durationToSlideCount()` function removed from `chunker.ts`
- Generate button moved to a clean right-aligned position below the textarea card

---

## 2026-05-31 (earlier)

### Gemini chain — full end-to-end fix + detailed comments
**Root cause:** `@google/generative-ai` and `zod` are installed in `frontend/node_modules/` but imported from `backend/landing-page/` which has no `node_modules`. TanStack Start's SSR module runner externalises `node_modules` packages and lets Node resolve them natively; Node walks up from `backend/` and never finds the packages.

**Fix:** `frontend/src/server/geminiShim.ts` — re-exports both packages from inside `frontend/src/` so Node's upward directory search reaches `frontend/node_modules/`. Backend files import via the `@/` path alias which `vite-tsconfig-paths` rewrites to an absolute path, bypassing externalisation.

**Files changed:**
- `frontend/src/server/geminiShim.ts` *(new)* — shim that re-exports `GoogleGenerativeAI`, `SchemaType`, `Schema` (from `@google/generative-ai`) and `z`, `ZodTypeAny`, `ZodSchema` (from `zod`)
- `backend/landing-page/geminiClient.ts` — changed imports from `"@google/generative-ai"` → `"@/server/geminiShim"`; removed key-logging startup code; added detailed inline comments
- `backend/landing-page/chunkingSchema.ts` — changed import from `"zod"` → `"@/server/geminiShim"`; added detailed inline comments
- `backend/landing-page/chunkingAgent.ts` — added detailed comments explaining the three-stage pipeline (API call → JSON parse → schema validate), error label conventions, and retry logic
- `backend/landing-page/proxyHandler.ts` — added comments explaining position in the call chain and validation rationale
- `frontend/src/lib/chunkApi.ts` — removed diagnostic key-logging; added full data-flow diagram in comments; documented swap points
- `frontend/tsconfig.json` — added `@backend/*`, `zod`, and `@google/generative-ai` path aliases so TypeScript correctly type-checks backend files
- `frontend/vite.config.ts` — reverted a prior failed `ssr.noExternal` attempt (wrong lever for this wrapper)

**Also in this commit:**
- Gemini model updated from `gemini-2.0-flash` → `gemini-2.5-flash` (prior model returns 404 for new API keys)
- `mockReason` field added to `HydrateResult` so `LandingPage` can display the actual Gemini error when falling back to mock generation
- `@google/generative-ai` added to `frontend/package.json` dependencies

---

## 2026-05-30

### Landing page — simplify UI, file upload, deck store, layout
- Removed marketing copy (feature chips, description paragraph, footer)
- Removed voice recording and "Upload image dump" stubs
- Added wired file input (`.txt .md .pdf .csv .json .docx`) — text extracted client-side and appended to the brain-dump textarea
- Added dashboard link in the landing page header
- Deck store (`frontend/src/lib/deckStore.ts`) — session-scoped `Map` of decks keyed by ID; `createDeck`, `getDeck`, `getAllDecks` (sorted by creation time); seeded with Meridian demo deck
- Route layout updated: `index.tsx` uses a phase state (`"landing" | "app"`) so the landing page transitions cleanly to the board/editor without a full navigation
- `?deckId=xxx` query param support for direct deck links from the dashboard

### Gemini model name fix
- `backend/landing-page/geminiClient.ts`: `"gemini-2.0-flash"` → `"gemini-2.5-flash"` (old model returns 404 for new users)
- `backend/test-gemini-key.mjs`: same model name update + log string

### Error surfacing improvements
- `mockReason?: string` added to `HydrateResult` — captures the actual Gemini error when falling back to mock
- `LandingPage` amber warning now shows the raw error string (monospace, truncated) alongside the "check your key" guidance
- `[GEMINI_KEY_MISSING]`, `[GEMINI_API_ERROR]`, `[GEMINI_PARSE_ERROR]`, `[GEMINI_SCHEMA_ERROR]` labels in `chunkingAgent.ts` bubble through to targeted error messages in the UI

### Infrastructure — key verification + standalone test
- `backend/test-gemini-key.mjs` — standalone Node.js script that loads `frontend/.env`, imports the SDK, calls Gemini, parses and validates the response; runs without the dev server
- `geminiClient.ts` `verifyGeminiKey()` logs key presence (length + first 4 chars only) on first request

---

## Earlier (pre-session, from branch history)

### Board view — bottom-bar nav, zoom, node redesign *(edd413c, 12e6deb, cc69059, 2b81b56)*
- Bottom navigation bar with board/editor mode toggle; 5% zoom step buttons
- Left rail with navigation panels
- Emerald narrative edges with relation labels (`sequence`, `supports`, `refutes`)
- Redesigned slide nodes with Meridian sample deck

### Slide editor — PowerPoint-style editing *(ac31e78, 4b44995, 3718d23, 7dededb)*
- Element editing: add, select, move, resize, delete, duplicate
- Text box inline editing with format toolbar (bold, italic, size, colour)
- Convert static slides to editable elements; edits persist in history
- Undo / redo via history reducer
- Live thumbnail rail — thumbnails update as elements change

### Graph canvas foundation *(9e8c3cf, 0528613, 2c3014a)*
- Flattened canvas surface for graph view
- Redesigned graph-view header (TopBar) + dashboard route
- Graph colour palette

### Semantic chunking agent + landing page *(06e79ab, 3d1888b)*
- `backend/landing-page/` scaffolded: `geminiClient.ts`, `chunkingAgent.ts`, `proxyHandler.ts`, `chunkingSchema.ts`
- `frontend/src/lib/chunkApi.ts` — TanStack Start `createServerFn` wrapping the backend proxy
- `frontend/src/lib/chunker.ts` — `hydrateToSlides()` pipeline: text → Gemini chunks → `SlideNode[]` + `Edge[]`
- Mock paragraph-split fallback when Gemini is unreachable
- Landing page initial version with textarea, duration picker, brand URL, file attach

---

## Data model (stable across branches)

Key types in `frontend/src/lib/projektor-data.ts`:

| Type | Description |
|---|---|
| `SlideNode` | A node in the graph; `designStatus: "bucket" \| "designed"` |
| `Edge` | Directed connection between nodes; `relation: EdgeRelation` |
| `EdgeRelation` | `"sequence" \| "supports" \| "refutes" \| "branches"` |
| `SceneKind` | `"title" \| "problem" \| "data"` — drives visual treatment |
| `DesignStatus` | `"bucket"` = raw AI content; `"designed"` = has a layout |
| `SlideElement` | An element on a designed slide (text, image, shape) |

---

## Branch structure

| Branch | Purpose |
|---|---|
| `main` | Stable base; full graph panels + slide editor; no Gemini chain |
| `frontend/landing_page` | **Active development** — Gemini chain, landing page, deck store, module fixes |
| `Slide-Viewer` | Slide editor experiment; stripped graph panels |
| `frontend/graph_view` | Graph panel work (merged into main) |
| `origin/dev` | Most feature-complete remote branch; multi-select, AI ghost nodes, Designs panel |
| `origin/frontend/graph_features` | Same as origin/dev; advanced graph exploration |
| `origin/feat/IR_slide_integration_2` | Alternate IR tree data model + Firestore persistence (incompatible with current model) |
