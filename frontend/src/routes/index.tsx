import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/projektor/TopBar";
import { BoardView } from "@/components/projektor/BoardView";
import { EditorView } from "@/components/projektor/EditorView";
import { useAuth } from "@/context/AuthContext";
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
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"board" | "editor">("board");
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
