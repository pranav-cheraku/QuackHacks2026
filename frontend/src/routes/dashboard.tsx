import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/projektor/Logo";
import { getAllDecks } from "@/lib/deckStore";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Projektor" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  // Re-read the store on each render so newly-created decks appear immediately.
  // The store is module-level (session-scoped) — no subscription needed for the hackathon.
  const [decks] = useState(() => getAllDecks());

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="h-14 flex items-center px-5 gap-2.5 border-b border-border bg-chrome">
        <Logo />
        <span className="font-semibold text-[15px]">Projektor</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-serif text-[34px] leading-tight">Your presentations</h1>
        <p className="text-muted-foreground text-[14px] mt-1">
          Decks created this session. Reload the page to start fresh.
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              to="/"
              search={{ deckId: deck.id }}
              className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[var(--sh-v)]"
            >
              <div className="aspect-[16/10] rounded-md bg-canvas border border-border mb-3 flex items-end p-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {deck.nodes.length} scene{deck.nodes.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="font-semibold text-[14px] group-hover:text-accent transition-colors truncate">
                {deck.name}
              </div>
              {deck.createdAt > 0 && (
                <div className="text-[12px] text-muted-foreground font-mono mt-0.5">
                  {new Date(deck.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </Link>
          ))}

          {/* New presentation — navigates to / which shows the landing phase fresh */}
          <button
            onClick={() => navigate({ to: "/", search: { deckId: undefined } })}
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
