# PRD: Agentic Presentation System

**Working title:** [Placeholder] (placeholder — rename)
**Status:** Draft v0.2 — handoff. Direction settled (see §0); open implementation questions in §11.
**Type:** Hackathon project. 4-person team, one weekend. Aspirational north star, phased so the realistic core ships and the rest is upside.

> **Handoff note:** This doc is being handed to other working threads that won't have the originating conversation. §0 lists decisions that are *settled* — build on them, don't relitigate them. Everything in §11 is genuinely open.

---

## 0. Settled decisions (do not relitigate)

Decided across prior discussion and locked for this build:

1. **Build our own engine — browser-rendered.** Full control over layout is the whole point. The deck renders on a canvas/DOM we control, *not* by driving Microsoft Office or wrestling python-pptx. This is what makes "actually looks good" achievable.
2. **Engine boundary (the line that keeps scope sane).** "Own engine" = our own *renderer + layout engine*. It does **NOT** mean rebuilding PowerPoint's editing UI or chasing `.pptx` round-trip fidelity. `.pptx` is an **export-only target** — exactly like Google Slides, which works in its own internal format and "Downloads as PowerPoint" via a one-way, lossy conversion. We export *out* (good enough to open); we do **not** import `.pptx` *in*. Thin end-of-weekend nice-to-have, never a pillar. Crossing into "faithful Office editor" sinks a 4-person team.
3. **Visual polish is the make-or-break bet.** We chose slides knowing judges will mentally benchmark our output against Gamma/Beautiful.ai. We are betting the project on output that *looks great in the demo*. The design-system lane gets the team's strongest visual taste and is treated as decisive, not decorative.
4. **The IR is both the architecture and the parallelization contract.** Lock the IR schema (§6.1) in hour one; every lane then builds against a stable interface instead of against each other (see §10.2).
5. **Theme is narrative, not scope.** Pitch it as "the presentation AI Microsoft should have shipped" — but build *one* focused tool, not an Office suite.
6. **Editing is bidirectional, through the IR.** Both the agent and the *user* edit the deck by changing the IR — the agent generates into it; the user drags/edits on the canvas and those edits write back into it. The renderer always projects the IR. (Inspired by Onlook/Lemon's visual-edit↔source loop — see §6.2.)
7. **The IR is the source of truth — not code.** The working format is our own structured schema, never JSX/Tailwind/HTML/`.pptx`. This is the key difference from Onlook/Lemon: they sync visual edits back to messy real code (their hardest problem); we sync to a schema *we* designed, so a drag maps to a known field on a known block. Never round-trip real code — code and `.pptx` are export targets only.

These reframe a few things in the original draft (notably the §5–§6 architecture, the §4 non-goal, and `.pptx`'s role), updated below to match.

---

## 1. One-line description

An agentic presentation tool where you author an *argument*, not slides — and the system owns everything between the idea and the audience: design, layout, format, delivery, and live adaptation.

---

## 2. Problem

Every existing "AI makes slides" tool (Copilot in PowerPoint, Gamma, Tome, Beautiful.ai, Google) shares the same failure modes:

- **Slides look AI-generated.** Naive element placement → overflow, misalignment, crowding, bad contrast.
- **One-shot, no iteration.** They dump a draft and stop. No self-correction, no judgment about whether the output is actually good.
- **No argument awareness.** They format text into bullet templates without any sense of whether the *talk* holds together.
- **Generic figures.** Clip art and stock layouts instead of real diagrams and data-driven charts.
- **Static output.** A `.pptx` file you then babysit manually.

One-shot prompt-to-deck is now **table stakes** and will not differentiate. The opportunity is in the parts everyone does badly: taste, argument, and delivery.

---

## 3. Thesis

Today people author *pixels on slides*. We flip that: **the human authors intent and substance; the system owns design, layout, format, delivery, and adaptation.** A presentation becomes a living artifact derived from a semantic source of truth — not a static file. The agent is a presentation partner with measurable taste, judgment about whether the argument is sound, and the ability to render the same ideas onto any surface and adapt them live.

This is a category shift, not "a better Copilot." That framing is what makes it win.

---

## 4. Goals / Non-goals

### Goals
- **Output that looks genuinely great, not merely clean** — the project rides on this (see §0.3). Clean-by-construction is the floor; demo-grade visual polish is the bet.
- **Direct manipulation that can't break the design** — the user can drag/edit anything and the engine keeps it clean by construction (§6.2). "Edit freely, never break the look" — neither PowerPoint nor Gamma offers this.
- An agent that *iterates* on its own work instead of one-shotting.
- Reason about the argument, not just the visuals.
- Collapse input friction to near-zero typing.
- One source → many output formats.
- (Aspirational) Adapt live during delivery.

### Non-goals
- **Own the engine, but not all of Office.** We *are* building our own browser-rendered renderer + layout engine — full layout control is the point (§0.1). The non-goal is the rabbit hole beyond that: rebuilding PowerPoint's editing UI or chasing `.pptx` round-trip fidelity. Render beautifully on a canvas we control; treat `.pptx` export as a thin nice-to-have (§0.2).
- **Do not fabricate substance.** The system must never invent the human's actual argument or data to fill space. Refusing to generate hollow filler is a *quality feature*, not a limitation.

---

## 5. Design tenets

1. **The IR is the single source of truth — and it's structured data, not code.** Everything visible is a projection of it. *Both* the agent and the user edit through the IR; nothing edits raw pixels or raw code. `.pptx`/HTML are export targets only (§0.7).
2. **Ugliness is structurally impossible, not "usually avoided."** A deterministic constraint layout engine renders the IR against a grid with spacing/alignment/typographic tokens.
3. **The human owns substance; the system owns everything else.** Typing is avoidable; substance is not.
4. **Iterate, don't one-shot.** Generation is a loop with critique, not a single pass.
5. **Graceful degradation.** Every tier can be shipped, faked for demo, or cut without breaking the spine.
6. **The user manipulates elements, never raw pixels.** A drag/edit expresses intent on a structured element; the engine always does final layout. That is *why* manual edits stay clean by construction — and why this isn't PowerPoint, where dragging a box leaves it wherever you dropped it.

---

## 6. Architecture spine (protect at all costs)

The entire product flows from one decision: **a semantic IR as source of truth, with every output as a projection.**

The IR is not slides-as-pixels. It is a document model of *meaning*:
- **Scenes** (≈ slides), each containing typed **content roles**: `claim`, `evidence`, `visual`, `data`, `transition`, `aside`.
- **Narrative relationships** between scenes (supports, contrasts, sequence, builds-on).
- A separate **style/brand layer** (tokens, palette, type, spacing) decoupled from content.

A **deterministic constraint layout engine** renders the IR against a grid. Because layout is derived from typed content under hard constraints, malformed/ugly output cannot be produced.

The IR is the **hub** — everything flows through it: (1) **Agent → IR** (generation), (2) **IR → renderer → pixels** (display), (3) **User edits on canvas → IR** (direct manipulation; see §6.2). This one decision unlocks: guaranteed-clean design, bidirectional editing, multi-format export, argument-level reasoning, and live adaptation. **Build this first. Never cut it.**

### 6.1 First-draft IR schema (for iteration — the most important thing to get right)

```ts
type Presentation = {
  id: string;
  meta: { title: string; audience?: string; durationTargetMin?: number };
  brand: BrandTokens;            // style layer, decoupled from content
  scenes: Scene[];
  edges: NarrativeEdge[];        // relationships between scenes
};

type Scene = {
  id: string;
  intent: string;                // the point this scene makes, in plain language
  blocks: ContentBlock[];
  layoutHint?: LayoutType;       // optional; engine may override
  spokenTrack?: string;          // speaker-notes / talk track (see §7 text model)
};

type ContentBlock =
  | { role: 'claim';      text: string }
  | { role: 'evidence';   text: string; source?: SourceRef }
  | { role: 'visual';     asset: AssetRef; caption?: string }
  | { role: 'data';       chart: ChartSpec; source?: SourceRef }
  | { role: 'figure';     diagram: DiagramSpec }   // system-generated vector
  | { role: 'aside';      text: string };

type NarrativeEdge = {
  from: string; to: string;
  relation: 'supports' | 'contrasts' | 'sequence' | 'builds-on';
};

type BrandTokens = {
  palette: string[]; fontHeading: string; fontBody: string;
  spacingScale: number[]; gridColumns: number;
};

type LayoutType =
  | 'hero-number' | 'split-compare' | 'timeline'
  | 'icon-row' | 'title' | 'quote' | 'data-focus' | 'image-full';
```

**Open questions on the schema** (iterate here first):
- Is `intent` per-scene enough, or do we need a top-level argument graph / thesis node?
- How do `layoutHint` and content-semantic layout selection interact — who wins?
- Where do live-delivery annotations (per-scene timing, backup-slide links) live?

### 6.2 Bidirectional editing — the IR is the hub

Inspired by Onlook/Lemon's visual-edit↔source loop, but easier here because our source is the IR, not arbitrary code.

- **Forward:** the agent generates and revises by writing the IR; the renderer projects it.
- **Reverse:** the user drags/edits on the canvas; each manipulation is translated into a *change to the IR* (move block to region, resize, re-emphasize, reorder) — never a raw pixel coordinate.
- **Enforcement:** the constraint layout engine re-lays out the IR after every change, so any edit — the agent's or the user's — renders clean by construction. **"Drag anything, it stays beautiful."** This is the thing PowerPoint can't do (drop a box and it stays wherever, janky) and Gamma won't (limited tweaking).

Because the IR is our own schema, the reverse arrow maps a drag to a known field on a known block — sidestepping Onlook/Lemon's hardest problem, patching messy third-party code (§0.7).

**Open UX decision (the crux):** how much freedom a drag gives — free-drag that *snaps* to the grid (Figma-like, feels direct) vs. region/slot-based placement (more constrained, easier to keep perfect). This shapes both the renderer and the engine; settle it early (tracked in §11).

---

## 7. Input model

The honest division of labor between human and system. **Typing is avoidable even though substance is not.**

### 7.1 Images — two distinct asset classes (do not conflate)

| Class | Source | System's job |
|---|---|---|
| **Raster assets you cannot generate** (screenshots, product photos, real charts, logos) | **Image dump** before generation | Vision-understand the pile (caption/classify each), decide which image belongs on which scene, crop/mask to the layout grid, flag gaps ("scene 5 has no visual — want a diagram?") |
| **Figures you should generate, not dump** (flowcharts, architecture diagrams, data→chart, comparison tables) | Produced by the agent | Reason about which figure best communicates the idea; emit as **vectors** in the IR (`figure`/`data` blocks) |

The intelligence in the dump is **placement + treatment + gap detection**, not the import itself. The generated-figure side is where most of the visual "wow" lives — do not under-build it by treating "images" as one thing.

### 7.2 Text — substance is human, friction is not

The human owns the *argument and the point*. The system must not fabricate it. But:

- **Collapse input to near-zero typing.** Accept substance in any form:
  - Voice brain-dump (ramble ~90s → agent structures it).
  - Paste from existing docs / notes / Slack / email.
  - Source-grounding (pull real numbers/facts from a connected doc or dataset).
- **Text value-adds:** structuring, cutting, delivery-rewrite, and — highest leverage — the **slide-vs-spoken split**: one typed point → *sparse slide text* + *speaker-notes talk track*. Humans are bad at deciding what goes on the slide vs. what they say; the agent is good at it. **Put this on the demo.**

---

## 8. Capability tiers

Priorities: **P0** = spine/MVP, **P1** = core differentiators, **P2** = aspirational/moonshot.

### Tier 1 — Design intelligence  *(P0–P1)*
- **Constraint layout engine** rendering the IR against a grid. *(P0)*
- **Content-semantic layout selection** (one stat → hero-number; comparison → split; process → timeline; three items → icon-row). *(P0)*
- **Self-critique loop** *(P1, key differentiator):* render scene → vision model evaluates crowding, overflow, contrast, balance, layout-match → revise IR → re-render until it passes. Taste as a measurable loop.
- **Brand extraction** from a URL or logo → palette + fonts → themes the whole deck; design system enforces it everywhere. *(P1, high demo value)*
- **Bidirectional canvas editing** *(P1):* the user drags/edits directly; edits write back to the IR and the constraint engine keeps every change clean by construction — "drag anything, it stays beautiful" (§6.2). Strengthens the polish bet rather than diluting it.

### Tier 2 — Argument intelligence  *(P1 — nobody else builds this)*
Because the IR encodes claims and relationships, critique the *talk*, not the visuals:
- Unsupported-claim detection ("scene 4's claim has no evidence").
- Redundancy detection ("you assert this twice").
- Narrative tension / ordering ("payoff precedes setup").
- Pacing & timing ("11 min of content for a 5-min slot — cut these").
- Devil's-advocate pass: anticipate the audience's hardest question, pre-build the backup slide.

This is the strongest differentiator. A great deck is a great argument; we'd be the only tool that knows the difference.

### Tier 3 — Knowledge grounding  *(P1–P2)*
- Connect sources (docs, data, repos, web); pull real facts with **citations**.
- **Live-linked charts** that update when the source data changes.
- Generated vector diagrams composed from a library of primitives.

### Tier 4 — Multi-format projection  *(P1)*
One IR → many surfaces from the same content:
- 16:9 deck, vertical mobile story, one-page PDF handout, standalone webpage, speaker script, (P2) narrated video.
- Change the idea once → every format updates. "Responsive design" for presentations — only possible because of the IR.
- **`.pptx` export** (e.g. python-pptx): thin "you can still open it in PowerPoint" nice-to-have. *(P2 — not a pillar; see §0.2.)*

### Tier 5 — Live delivery layer  *(P2 — the futuristic part)*
- Live transcription follows speech → auto-advance/highlight the current point.
- Audience asks a question → relevant backup slide surfaces in real time.
- Rehearsal coach: pacing, filler words, per-slide timing, suggested cuts.

### Moonshots  *(P2+)*
- Multi-agent authoring (designer / editor / fact-checker / skeptic).
- Memory layer that learns your style + your org's; reusable component library over time.
- Audience-adaptive versions (exec vs. engineer) from a single IR.

---

## 9. North-star demo

The 2-minute sequence that makes the category obvious — and degrades gracefully if pieces aren't ready:

1. Paste a **company URL** + a rough **brain-dump** (typed or voice).
2. System **extracts the brand** and generates the deck.
3. Watch the **self-critique loop** catch a weak/crowded slide and fix it — and the **argument-checker** flag an unsupported claim and fix it.
4. One click **reprojects** the deck into a mobile story + a PDF handout.
5. Start talking — the **deck follows your voice**; a curveball "judge" question makes the right **backup slide appear on its own**.

Taste → argument → multi-format → live adaptation, in one flow.

---

## 10. Execution — phasing & team

### 10.1 Phasing (cut from the bottom up)

- **MVP (P0):** IR + constraint layout engine + content-semantic layouts + a polished design system + basic generation from pasted text + image dump with placement.
- **V1 (P1):** Self-critique loop + brand extraction + argument intelligence + slide/spoken split + multi-format projection.
- **Stretch (P2):** Knowledge grounding with live charts + live delivery layer + `.pptx` export.
- **Dream (P2+):** Multi-agent authoring + memory/learning + audience-adaptive variants.

### 10.2 Team lanes (4 people)

Four loosely-coupled lanes, all building against the IR so nobody blocks anyone:

- **Engine / layout** — the renderer + constraint layout that turns IR into clean slides. The hardest systems lane.
- **Agent** — input → IR: generation, structuring, the slide-vs-spoken split, figure/data decisions.
- **Design system** — templates, tokens, typography, the self-critique pass. **This is the make-or-break lane (§0.3); staff it with the strongest visual taste.**
- **Glue + demo** — orchestration/state, the demo dataset + brand, the pitch and the polish that sells it.

Coupling points are deliberately thin: Agent and Engine meet *only* at the IR; Design defines how IR renders; Glue wires them together.

### 10.3 First hour

Agree the IR schema (§6.1) before anyone writes feature code. It is the contract every lane depends on — getting it stable early is what turns 4 people into parallel throughput instead of merge conflicts. This is the single highest-leverage hour of the weekend.

---

## 11. Open questions / decisions to make

1. **IR schema** (§6.1) — the foundational decision. Argument graph vs. per-scene intent? Where do delivery annotations live?
2. **Rendering substrate** — in-browser is decided (§0.1); still open: HTML/CSS + DOM vs. SVG vs. canvas for the layout engine. Trade-off: styling ease/design fidelity vs. precision and control.
3. **Layout engine** — hand-written constraint solver vs. existing layout library vs. CSS grid + rules? How "hard" are the constraints?
4. **Self-critique model** — which vision model; how many revise loops before we stop; how to keep it fast enough to demo.
5. **Editing freedom (the crux of the editing UX)** — free-drag that snaps to the grid (Figma-like) vs. region/slot-based placement. Shapes both the renderer and the engine; decide early (§6.2).
6. **`.pptx` export** — export-only and lossy, like Google Slides' "Download as PowerPoint" (§0.2). "Good enough to open" is fine; do not chase faithful round-trip, and do not build `.pptx` *import*.
7. **Naming** — replace _Projektor_ placeholder.

---

## 12. Competitive note

The space is crowded, and Gamma/Beautiful.ai set a high bar on design polish — which is exactly the bar we've chosen to clear in the demo (§0.3). One-shot generation is commoditized. Our wedges, in order: **(1) demo-grade visual polish from a constraint layout engine + self-critique loop** (taste by construction — and the first thing judges feel), **(2) bidirectional editing that can't break the design** ("drag anything, it stays beautiful" — neither PowerPoint nor Gamma offers it), **(3) argument intelligence** (unbuilt by competitors), **(4) the slide-vs-spoken split + multi-format projection** (concrete, demoable value). Live delivery is the aspirational ceiling. We are not trying to beat Gamma in the *market* — we're clearing its polish bar *and* showing the editing + reasoning layers it lacks, in one demo.
