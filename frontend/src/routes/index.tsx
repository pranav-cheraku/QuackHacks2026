import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { StatusBar } from "@/components/projektor/StatusBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";
import { DEFAULT_ZOOM, ZOOM_STEP, clampZoom, zoomBy } from "@/lib/viewport";

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
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [editorStart, setEditorStart] = useState<string | null>(null);

  const setZoom = (nextZoom: number) => setZoomState(clampZoom(nextZoom));
  const zoomIn = () => setZoomState((current) => zoomBy(current, ZOOM_STEP));
  const zoomOut = () => setZoomState((current) => zoomBy(current, -ZOOM_STEP));
  const toggleGrid = () => setIsGridVisible((visible) => !visible);

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

  return (
    <div className="h-screen flex flex-col bg-chrome text-ink overflow-hidden">
      <TopBar mode={mode} setMode={setMode} deckTitle="Q3 Strategy Review" />
      {mode === "board" && (
        <BoardView
          zoom={zoom}
          setZoom={setZoom}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          isGridVisible={isGridVisible}
          onOpenEditor={(id) => {
            setEditorStart(id);
            setMode("editor");
          }}
        />
      )}
      {/* EditorView stays mounted so useState never resets; display:none hides it in board mode */}
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
      <StatusBar
        mode={mode}
        slideCount={6}
        branchCount={1}
        zoom={zoom}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        isGridVisible={isGridVisible}
        toggleGrid={toggleGrid}
        deckName="q3-strategy-review.proj"
      />
    </div>
  );
}
