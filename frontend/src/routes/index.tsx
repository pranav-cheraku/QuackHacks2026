import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";
import { LandingPage } from "@/components/projektor/LandingPage";
import { INITIAL_NODES, INITIAL_EDGES, type SlideNode, type Edge } from "@/lib/projektor-data";
import type { ContentNode } from "@/lib/ir";
import { createDeck } from "@/lib/deckStore";
import { loadDeck, saveDeck, createProject } from "@/lib/firestore-slides";
import type { HydrateResult } from "@/lib/chunker";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_ZOOM, ZOOM_STEP, clampZoom, zoomBy } from "@/lib/viewport";

// ── Route search params: ?projectId=xxx loads a project from Firestore
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    projectId: typeof search.projectId === "string" ? search.projectId : undefined,
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
  const { projectId } = Route.useSearch();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"landing" | "app">(
    projectId ? "app" : "landing",
  );
  const [deck, setDeck] = useState<SlideNode[]>(INITIAL_NODES);
  const [deckEdges, setDeckEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [mode, setMode] = useState<"board" | "editor">("editor");
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [editorStart, setEditorStart] = useState<string | null>(null);
  // True once deck is hydrated from Firestore. EditorView uses this signal to
  // re-init its history from the loaded deck (fires at most once per project).
  const [deckLoaded, setDeckLoaded] = useState(false);
  const [contentPool, setContentPool] = useState<ContentNode[]>([]);
  // Incremented each time the user double-clicks into the editor — ensures
  // EditorView re-materializes the slide root even if startNodeId hasn't changed.
  const [editorKey, setEditorKey] = useState(0);
  // Tracks the active project ID so saves go to the right Firestore document.
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId ?? null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the project from Firestore when a projectId is present in the URL.
  // Runs whenever projectId changes so navigating between projects works correctly.
  useEffect(() => {
    if (!currentUser || !projectId) return;
    setDeckLoaded(false);
    loadDeck(currentUser.uid, projectId)
      .then((saved) => {
        if (saved && saved.nodes.length > 0) {
          setDeck(saved.nodes);
          setDeckEdges(saved.edges);
          setContentPool(saved.contentPool);
          setMode("board");
          setPhase("app");
        }
      })
      .catch((err) => console.error("[index] Failed to load project:", err))
      .finally(() => setDeckLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, projectId]);

  // Auto-save the deck to Firestore whenever EditorView changes it (debounced).
  // Only runs in "app" phase with a known project.
  useEffect(() => {
    if (!currentUser || !deckLoaded || phase !== "app" || !currentProjectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDeck(currentUser.uid, currentProjectId, deck, deckEdges, contentPool).catch((err) =>
        console.error("[index] Failed to save deck:", err),
      );
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, deckEdges, contentPool, currentUser, deckLoaded, phase, currentProjectId]);

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


  const setZoom = (nextZoom: number) => setZoomState(clampZoom(nextZoom));
  const toggleGrid = () => setIsGridVisible((v) => !v);

  // GRAPH VIEW ENTRY POINT: generate output lands on the graph (board mode).
  // Creates a new Firestore project with the initial deck, then navigates to it.
  const handleGenerate = async ({ nodes, edges, contentPool: pool }: HydrateResult) => {
    createDeck(nodes, edges); // keep session store in sync for any session-only consumers
    const name = nodes[0]?.title ?? "Untitled";
    const newProjectId = await createProject(currentUser!.uid, name, nodes, edges, pool);
    setCurrentProjectId(newProjectId);
    setDeck(nodes);
    setDeckEdges(edges);
    setContentPool(pool);
    setDeckLoaded(true);
    setEditorStart(null);
    setMode("board");
    setPhase("app");
    navigate({ to: "/", search: { projectId: newProjectId } });
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
          projectId={currentProjectId ?? undefined}
          onOpenEditor={(id) => {
            setEditorStart(id);
            setEditorKey((k) => k + 1);
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
          contentPool={contentPool}
          entryKey={editorKey}
        />
      </div>
    </div>
  );
}
