import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";
import { LandingPage } from "@/components/projektor/LandingPage";
import { INITIAL_NODES, INITIAL_EDGES, type SlideNode, type Edge } from "@/lib/projektor-data";
import { createDeck, getDeck } from "@/lib/deckStore";
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

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate({ to: "/signin" });
    }
  }, [loading, currentUser, navigate]);

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
  const handleGenerate = ({ nodes, edges }: HydrateResult) => {
    createDeck(nodes, edges);
    setDeck(nodes);
    setDeckEdges(edges);
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
