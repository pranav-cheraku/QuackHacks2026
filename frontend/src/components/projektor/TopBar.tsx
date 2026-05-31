import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Play, Check, Share2, LayoutGrid, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  mode: "board" | "editor";
  setMode: (m: "board" | "editor") => void;
  presentationName?: string;
}

const TABS: { value: "board" | "editor"; label: string }[] = [
  { value: "board", label: "Graph View" },
  { value: "editor", label: "Slides View" },
];

function getInitials(user: { displayName: string | null; email: string | null }): string {
  if (user.displayName) {
    const parts = user.displayName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return user.email ? user.email[0].toUpperCase() : "?";
}

export function TopBar({
  mode,
  setMode,
  presentationName = "Meridian — Series A",
}: Props) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut(auth);
    navigate({ to: "/signin" });
  }

  return (
    <header className="relative h-14 flex items-center px-3 gap-3 border-b border-border bg-chrome select-none shrink-0">
      {/* Left: logo · dashboard · current presentation */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Logo />
        {/* TODO: /dashboard is a temporary placeholder route — wire to the real
            "all presentations" view once it exists. */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold rounded-md text-ink hover:bg-canvas/70 transition-colors"
        >
          <LayoutGrid size={14} className="text-muted-foreground" />
          Dashboard
        </Link>

        <div className="h-5 w-px bg-border mx-1" />

        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <span className="font-semibold truncate">{presentationName}</span>
          <span className="flex items-center gap-1 text-muted-foreground font-mono text-[11px] shrink-0">
            <Check size={11} strokeWidth={2.5} /> Saved
          </span>
        </div>
      </div>

      {/* Center: view tabs */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-end gap-7">
        {TABS.map((t) => {
          const active = mode === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`text-[15px] transition-colors ${
                  active
                    ? "font-semibold"
                    : "font-medium text-muted-foreground hover:text-ink"
                }`}
                style={active ? { color: "var(--accent)" } : undefined}
              >
                {t.label}
              </span>
              <span
                className="h-[2.5px] w-full rounded-full"
                style={{ background: active ? "var(--accent)" : "transparent" }}
              />
            </button>
          );
        })}
      </nav>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Share2 size={14} /> Share
        </button>
        <button
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ink)" }}
        >
          <Play size={12} fill="white" /> Present
        </button>

        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 rounded-full w-8 h-8 overflow-hidden shrink-0 ring-2 ring-transparent hover:ring-accent/40 transition-shadow focus:outline-none">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="w-full h-full flex items-center justify-center text-[12px] font-semibold"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    {getInitials(currentUser)}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  {currentUser.displayName && (
                    <span className="font-semibold text-ink text-[13px] truncate">
                      {currentUser.displayName}
                    </span>
                  )}
                  <span className="text-[12px] text-muted-foreground truncate">
                    {currentUser.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-danger focus:text-danger focus:bg-danger/10 cursor-pointer"
              >
                <LogOut size={14} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
