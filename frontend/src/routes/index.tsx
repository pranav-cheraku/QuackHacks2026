import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/signin" });
  },
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
  const [mode, setMode] = useState<"board" | "editor">("board");
  const [zoom, setZoom] = useState(1);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [editorStart, setEditorStart] = useState<string | null>(null);

  const toggleGrid = () => setIsGridVisible((v) => !v);

  return (
    <div className="h-screen flex flex-col bg-chrome text-ink overflow-hidden">
      <TopBar mode={mode} setMode={setMode} />
      {mode === "board" && (
        <BoardView
          zoom={zoom}
          setZoom={setZoom}
          onOpenEditor={(id) => {
            setEditorStart(id);
            setMode("editor");
          }}
        />
      )}
      {/* EditorView stays mounted so its undo history / edits survive Board↔Slides switches */}
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
