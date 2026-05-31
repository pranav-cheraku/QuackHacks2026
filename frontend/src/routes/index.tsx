import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { StatusBar } from "@/components/projektor/StatusBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";

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
  const [mode, setMode] = useState<"board" | "editor">("editor");
  const [zoom, setZoom] = useState(0.85);
  const [editorStart, setEditorStart] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-chrome text-ink overflow-hidden">
      <TopBar mode={mode} setMode={setMode} deckTitle="Q3 Strategy Review" />
      {mode === "board" ? (
        <BoardView
          zoom={zoom}
          setZoom={setZoom}
          onOpenEditor={(id) => {
            setEditorStart(id);
            setMode("editor");
          }}
        />
      ) : (
        <EditorView startNodeId={editorStart} />
      )}
      <StatusBar
        mode={mode}
        slideCount={6}
        branchCount={1}
        zoom={zoom}
        setZoom={setZoom}
        deckName="q3-strategy-review.proj"
      />
    </div>
  );
}
