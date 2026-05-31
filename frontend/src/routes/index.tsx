import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";
import { useAuth } from "@/context/AuthContext";

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
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  // All hooks must be declared before any conditional returns
  const [mode, setMode] = useState<"board" | "editor">("board");
  const [zoom, setZoom] = useState(1);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [editorStart, setEditorStart] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate({ to: "/signin" });
    }
  }, [loading, currentUser, navigate]);

  if (loading || !currentUser) return null;

  const toggleGrid = () => setIsGridVisible((v) => !v);

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
