import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";
import { LandingPage } from "@/components/projektor/LandingPage";
import { INITIAL_NODES, INITIAL_EDGES, type SlideNode, type Edge } from "@/lib/projektor-data";
import type { HydrateResult } from "@/lib/chunker";

export const Route = createFileRoute("/")({
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
  // phase starts at "landing" on every mount — fresh on each navigation to /.
  // Direct / loads also show landing; "Start from a blank board" skips it.
  const [phase, setPhase] = useState<"landing" | "app">("landing");
  const [deck, setDeck] = useState<SlideNode[]>(INITIAL_NODES);
  const [deckEdges, setDeckEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [mode, setMode] = useState<"board" | "editor">("editor");
  const [zoom, setZoom] = useState(0.85);
  const [editorStart, setEditorStart] = useState<string | null>(null);

  // GRAPH VIEW ENTRY POINT: generate output lands on the graph (board mode), NOT the editor.
  // Buckets populate the graph as structural argument nodes; slide design happens
  // lazily per-bucket (double-click → slide-design agent → candidate picker).
  const handleGenerate = ({ nodes, edges }: HydrateResult) => {
    setDeck(nodes);
    setDeckEdges(edges);
    setEditorStart(null);
    setMode("board"); // ← graph view, buckets visible immediately
    setPhase("app");
  };

  const handleSkip = () => {
    setPhase("app");
  };

  if (phase === "landing") {
    return <LandingPage onGenerate={handleGenerate} onSkip={handleSkip} />;
  }

  return (
    <div className="h-screen flex flex-col bg-chrome text-ink overflow-hidden">
      <TopBar mode={mode} setMode={setMode} />
      {mode === "board" && (
        <BoardView
          initialNodes={deck}
          initialEdges={deckEdges}
          zoom={zoom}
          setZoom={setZoom}
          onOpenEditor={(id) => {
            setEditorStart(id);
            setMode("editor");
          }}
          // GRAPH SYNC: when the user picks a slide design candidate in the graph,
          // the node's elements + designStatus are updated in BoardView's local state.
          // onDesignApplied propagates that back up to Projektor.deck so EditorView
          // (seeded from deck) reflects the realized layout when the user switches views.
          // TODO: once deck is lifted to fully controlled state, remove this callback
          // and instead drive both views from a single shared nodes array.
          onDesignApplied={(updatedNode) =>
            setDeck((prev) =>
              prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
            )
          }
        />
      )}
      {/* EditorView stays mounted so useState never resets; display:none hides it in board mode */}
      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{ display: mode === "editor" ? undefined : "none" }}
      >
        <EditorView initialNodes={deck} startNodeId={editorStart} />
      </div>
    </div>
  );
}
