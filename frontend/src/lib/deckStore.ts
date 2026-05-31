// ── Session-scoped deck registry ──────────────────────────────────────────────
// Module-level Map: persists across React re-renders and route transitions,
// but resets on page refresh (no backend persistence yet — local state only).
// Each generated presentation gets a unique ID and lives here for the session.
//
// Multiple-deck support: every "Generate deck" call creates a new DeckEntry
// with a fresh ID. The Dashboard reads getAllDecks() to show all decks created
// this session. Clicking a deck navigates to /?deckId=xxx which loads it here.

import { INITIAL_NODES, INITIAL_EDGES, type SlideNode, type Edge } from "./projektor-data";

export interface DeckEntry {
  id: string;
  name: string;
  createdAt: number;
  nodes: SlideNode[];
  edges: Edge[];
}

const store = new Map<string, DeckEntry>();

// ── Seed the demo deck so Dashboard → "Meridian — Series A" works immediately
const DEMO_ID = "meridian-demo";
store.set(DEMO_ID, {
  id: DEMO_ID,
  name: "Meridian — Series A",
  createdAt: 0,
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
});

export function createDeck(nodes: SlideNode[], edges: Edge[]): DeckEntry {
  const id = `deck-${Date.now()}`;
  const name = nodes[0]?.title ?? "Untitled";
  const entry: DeckEntry = { id, name, createdAt: Date.now(), nodes, edges };
  store.set(id, entry);
  return entry;
}

export function getDeck(id: string): DeckEntry | undefined {
  return store.get(id);
}

export function getAllDecks(): DeckEntry[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export { DEMO_ID };
