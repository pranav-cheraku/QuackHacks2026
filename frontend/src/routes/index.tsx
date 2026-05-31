import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";
import { LandingPage } from "@/components/projektor/LandingPage";
import { INITIAL_NODES, INITIAL_EDGES, type SlideNode, type Edge } from "@/lib/projektor-data";
import type { ContentNode } from "@/lib/ir";
import { createDeck, getDeck } from "@/lib/deckStore";
import { loadDeck, saveDeck } from "@/lib/firestore-slides";
import type { HydrateResult } from "@/lib/chunker";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_ZOOM, ZOOM_STEP, clampZoom, zoomBy } from "@/lib/viewport";

// ── Route search params: ?deckId=xxx loads a specific deck from the session store
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    deckId: typeof search.deckId === "string" ? search.deckId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Projektor — Board + Editor" },
      {
        name: "description",
        content:
          "A quiet, tool-like presentation app with a freeform board and a focused slide editor.",
      },
    ],
  }),
  component: Projektor,
});

function Projektor() {
  const { deckId } = Route.useSearch();
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  const savedDeck = deckId ? getDeck(deckId) : undefined;

  const [phase, setPhase] = useState<"landing" | "app">(
    savedDeck ? "app" : "landing",
  );
  const [deck, setDeck] = useState<SlideNode[]>(savedDeck?.nodes ?? INITIAL_NODES);
  const [deckEdges, setDeckEdges] = useState<Edge[]>(savedDeck?.edges ?? INITIAL_EDGES);
  const [mode, setMode] = useState<"board" | "editor">(savedDeck ? "board" : "editor");
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [editorStart, setEditorStart] = useState<string | null>(null);
  // True once deck is hydrated from Firestore (or session store). EditorView uses
  // this signal to re-init its history from the loaded deck (fires at most once).
  const [deckLoaded, setDeckLoaded] = useState(!!savedDeck);
  const [contentPool, setContentPool] = useState<ContentNode[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate({ to: "/signin" });
    }
  }, [loading, currentUser, navigate]);

  // Pre-load the user's persisted deck from Firestore on first auth so that
  // EditorView and BoardView can initialize from it without an extra round-trip.
  // IMPORTANT: does NOT change `phase` — the landing page is always shown for
  // a bare `/` navigation (no ?deckId=). The user explicitly generates to enter
  // the board. Changing phase here would bypass the landing page for returning
  // users and break "create a new project".
  useEffect(() => {
    if (!currentUser || savedDeck) return;
    loadDeck(currentUser.uid)
      .then((saved) => {
        if (saved && saved.nodes.length > 0) {
          setDeck(saved.nodes);
          setDeckEdges(saved.edges);
          setContentPool(saved.contentPool);
          // phase stays "landing" — user must generate to enter the board.
        }
      })
      .catch((err) => console.error("[index] Failed to load deck:", err))
      .finally(() => setDeckLoaded(true));
  // Run once per auth session — savedDeck is captured in closure at mount time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Auto-save the shared deck to Firestore whenever EditorView changes it.
  // BoardView has its own save for graph-structure changes; this covers
  // slide-layout writes (root, candidates, activeDesignId) from EditorView.
  // Only runs in "app" phase — not during the pre-load on the landing page.
  useEffect(() => {
    if (!currentUser || !deckLoaded || phase !== "app") return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDeck(currentUser.uid, deck, deckEdges, contentPool).catch((err) =>
        console.error("[index] Failed to save deck:", err),
      );
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, deckEdges, contentPool, currentUser, deckLoaded, phase]);

  // Callback for EditorView: receives slide-layout updates and merges them into
  // the shared deck. Also picked up by BoardView via externalSlides so graph
  // nodes' root fields stay fresh without a Firestore round-trip.
  const handleDeckChange = (nodes: SlideNode[], edges: Edge[]) => {
    setDeck(nodes);
    setDeckEdges(edges);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      const isZoomIn = e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
      const isZoomOut = e.key === "-" || e.key === "_" || e.code === "NumpadSubtract";
      if (!isZoomIn && !isZoomOut) return;
      e.preventDefault();
      if (isZoomIn) setZoomState((current) => zoomBy(current, ZOOM_STEP));
      if (isZoomOut) setZoomState((current) => zoomBy(current, -ZOOM_STEP));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading || !currentUser) return null;

  const setZoom = (nextZoom: number) => setZoomState(clampZoom(nextZoom));
  const toggleGrid = () => setIsGridVisible((v) => !v);

  // GRAPH VIEW ENTRY POINT: generate output lands on the graph (board mode).
  // Buckets populate the graph as structural argument nodes; each call creates
  // a new deck entry in the session store (multi-deck support).
  const handleGenerate = ({ nodes, edges, contentPool: pool }: HydrateResult) => {
    createDeck(nodes, edges);
    setDeck(nodes);
    setDeckEdges(edges);
    setContentPool(pool);
    setDeckLoaded(true); // signal EditorView to re-init from the freshly generated deck
    setEditorStart(null);
    setMode("board");
    setPhase("app");
  };

  if (phase === "landing") {
    return <LandingPage onGenerate={handleGenerate} />;
  }

  return (
    <div className="h-screen flex flex-col bg-chrome text-ink overflow-hidden">
      <TopBar mode={mode} setMode={setMode} />
      {/* Both views stay mounted (hidden via display) so their local state —
          the graph's nodes/edges/pan and the editor's undo history — survives
          Board↔Slides switches instead of resetting on unmount. */}
      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{ display: mode === "board" ? undefined : "none" }}
      >
        <BoardView
          initialNodes={deck}
          initialEdges={deckEdges}
          externalSlides={deck}
          onNodesChange={handleDeckChange}
          contentPool={contentPool}
          onContentPoolChange={setContentPool}
          zoom={zoom}
          setZoom={setZoom}
          onOpenEditor={(id) => {
            setEditorStart(id);
            setMode("editor");
          }}
        />
      </div>
      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{ display: mode === "editor" ? undefined : "none" }}
      >
        <EditorView
          nodes={deck}
          edges={deckEdges}
          onDeckChange={handleDeckChange}
          deckLoaded={deckLoaded}
          startNodeId={editorStart}
          zoom={zoom}
          setZoom={setZoom}
          isGridVisible={isGridVisible}
          toggleGrid={toggleGrid}
        />
      </div>
    </div>
  );
}
