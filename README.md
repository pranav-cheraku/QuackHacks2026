# SlideQuest

AI-powered presentation builder. Paste a brain dump of notes, docs, or raw text — SlideQuest semantically chunks it with Gemini 2.5 Flash, builds a narrative graph, and lets you edit the resulting slides in a PowerPoint-style editor.

Built for QuackHacks 2026.

---

## How it works

1. **Landing page** — paste text, attach files (`.txt`, `.md`, `.pdf`, `.csv`, `.json`), and click Generate
2. **Chunking** — a server-side Gemini 2.5 Flash call breaks the content into semantically coherent slide chunks with headlines, body text, and scene kinds (`title`, `problem`, `data`)
3. **Graph view** — chunks become nodes on a canvas connected by narrative edges (`sequence`, `supports`, `refutes`, `branches`)
4. **Editor view** — PowerPoint-style slide editor with inline text editing, element add/move/resize/delete, format toolbar, and undo/redo

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TanStack Start (SSR) |
| Routing | TanStack Router |
| Styling | Tailwind CSS 4 + Radix UI |
| Language | TypeScript 5 |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Backend API | TanStack Start server functions (Node) |
| Persistence | Firebase / Firestore |
| Build | Vite 7 |
| Validation | Zod |

---

## Project structure

```
QuackHacks2026/
  frontend/               # React app (TanStack Start)
    src/
      components/
        projektor/        # All app UI (LandingPage, BoardView, EditorView, ...)
        ui/               # shadcn/ui primitives
      lib/
        ir.ts             # Intermediate representation — slide data model + tree ops
        chunker.ts        # hydrateToSlides(): text → SlideNode[] + Edge[]
        deckStore.ts      # Session-scoped deck store
        slide-model.ts    # SlideNode / Edge types
        projektor-data.ts # Shared domain types
      routes/
        api/chunk.ts      # POST /api/chunk — TanStack Start API route
  backend/
    landing-page/         # Gemini chunking module
      geminiClient.ts     # SDK setup, system prompt, response schema
      chunkingAgent.ts    # Prompt build, API call, retry, validate
      chunkingSchema.ts   # Shared types + Zod validators
      proxyHandler.ts     # Input validation + entry point
    .env.example          # Environment variable template
  fireabase/              # Firebase Functions (slide render)
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### Setup

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Configure environment
cp ../backend/.env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=your_key_here

# 3. Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`. The chunking API is at `POST /api/chunk`.

### Verify your Gemini key (optional)

```bash
node backend/test-gemini-key.mjs
```

---

## Data model

Core types in [frontend/src/lib/projektor-data.ts](frontend/src/lib/projektor-data.ts):

| Type | Description |
|---|---|
| `SlideNode` | A node in the graph; `designStatus: "bucket" \| "designed"` |
| `Edge` | Directed connection between nodes with a `relation` label |
| `EdgeRelation` | `"sequence" \| "supports" \| "refutes" \| "branches"` |
| `SceneKind` | `"title" \| "problem" \| "data"` — drives visual treatment |
| `DesignStatus` | `"bucket"` = raw AI content; `"designed"` = has a layout |
| `SlideElement` | An element on a designed slide (text, image, shape) |

The intermediate representation (IR) lives in [frontend/src/lib/ir.ts](frontend/src/lib/ir.ts) — a recursive `LayoutNode` tree (stack + leaf nodes) that the slide renderer consumes directly.

---

