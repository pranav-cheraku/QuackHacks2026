import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/projektor/Logo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Your presentations" },
      {
        name: "description",
        content: "Temporary placeholder dashboard of your presentations.",
      },
    ],
  }),
  component: Dashboard,
});

// Static placeholder data — no backend yet.
const PRESENTATIONS = [{ name: "Meridian — Series A", meta: "6 scenes" }];

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="h-14 flex items-center px-4 gap-2.5 border-b border-border bg-chrome">
        <Logo />
        <span className="font-semibold text-[15px]">Dashboard</span>
        <span className="text-[11px] text-muted-foreground font-mono ml-1">
          placeholder
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-serif text-[34px] leading-tight">
          Your presentations
        </h1>
        <p className="text-muted-foreground text-[14px] mt-1">
          Temporary static dashboard — real data comes later.
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          {PRESENTATIONS.map((p) => (
            <Link
              key={p.name}
              to="/"
              className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[var(--sh-v)]"
            >
              <div className="aspect-[16/10] rounded-md bg-canvas border border-border mb-3" />
              <div className="font-semibold text-[14px] group-hover:text-accent transition-colors">
                {p.name}
              </div>
              <div className="text-[12px] text-muted-foreground font-mono mt-0.5">
                {p.meta}
              </div>
            </Link>
          ))}

          <button className="rounded-xl border border-dashed border-border p-4 min-h-[170px] flex items-center justify-center text-[13px] font-semibold text-muted-foreground transition-colors hover:text-ink hover:border-accent/50">
            + New presentation
          </button>
        </div>
      </main>
    </div>
  );
}
