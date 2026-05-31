import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/projektor/Logo";
import { listProjects, type ProjectMeta } from "@/lib/firestore-slides";
import { useAuth } from "@/context/AuthContext";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Projektor" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    listProjects(currentUser.uid)
      .then(setProjects)
      .catch((err) => console.error("[Dashboard] Failed to load projects:", err));
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="h-14 flex items-center px-5 gap-2.5 border-b border-border bg-chrome">
        <Logo />
        <span className="font-semibold text-[15px]">Projektor</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-serif text-[34px] leading-tight">Your presentations</h1>
        <p className="text-muted-foreground text-[14px] mt-1">
          All presentations saved to your account.
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to="/"
              search={{ projectId: project.id }}
              className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[var(--sh-v)]"
            >
              <div className="aspect-[16/10] rounded-md bg-canvas border border-border mb-3" />
              <div className="font-semibold text-[14px] group-hover:text-accent transition-colors truncate">
                {project.name}
              </div>
              {project.updatedAt > 0 && (
                <div className="text-[12px] text-muted-foreground font-mono mt-0.5">
                  {new Date(project.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </div>
              )}
            </Link>
          ))}

          {/* New presentation — navigates to / which shows the landing phase */}
          <button
            onClick={() => navigate({ to: "/", search: { projectId: undefined } })}
            className="rounded-xl border border-dashed border-border p-4 min-h-[170px] flex flex-col items-center justify-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-ink hover:border-accent/50"
          >
            <Plus size={20} strokeWidth={1.5} />
            New presentation
          </button>
        </div>
      </main>
    </div>
  );
}
