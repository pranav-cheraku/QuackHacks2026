import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Play, Check, Share2, LayoutGrid, LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  mode: "board" | "editor";
  setMode: (m: "board" | "editor") => void;
  presentationName?: string;
}

const TABS: { value: "board" | "editor"; label: string }[] = [
  { value: "board", label: "Graph View" },
  { value: "editor", label: "Slides View" },
];

function deleteErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      return "Incorrect password.";
    }
    if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
    if (code === "auth/popup-closed-by-user") return "Confirmation cancelled.";
  }
  return "Something went wrong. Please try again.";
}

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const isPasswordUser = currentUser?.providerData.some(
    (p) => p.providerId === "password",
  );

  async function handleSignOut() {
    await signOut(auth);
    navigate({ to: "/signin" });
  }

  function openDeleteDialog() {
    setDeletePassword("");
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDeleteAccount() {
    if (!currentUser) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      if (isPasswordUser) {
        const credential = EmailAuthProvider.credential(
          currentUser.email!,
          deletePassword,
        );
        await reauthenticateWithCredential(currentUser, credential);
      } else {
        await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
      }
      await deleteUser(currentUser);
      navigate({ to: "/signin" });
    } catch (err: unknown) {
      setDeleteError(deleteErrorMessage(err));
    } finally {
      setDeleteSubmitting(false);
    }
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
              <DropdownMenuItem
                onClick={openDeleteDialog}
                className="text-danger focus:text-danger focus:bg-danger/10 cursor-pointer"
              >
                <Trash2 size={14} />
                Delete account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete account confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This is permanent and cannot be undone. All your data will be
              lost.
            </DialogDescription>
          </DialogHeader>

          {isPasswordUser ? (
            <div className="mt-1">
              <label
                htmlFor="delete-password"
                className="block text-xs font-medium text-ink mb-1.5"
              >
                Enter your password to confirm
              </label>
              <input
                id="delete-password"
                type="password"
                placeholder="••••••••"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDeleteAccount()}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-danger/30 transition"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              You'll be asked to confirm with Google before your account is
              deleted.
            </p>
          )}

          {deleteError && (
            <p className="text-xs text-danger">{deleteError}</p>
          )}

          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background text-ink hover:bg-canvas transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteSubmitting || (isPasswordUser && !deletePassword)}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--danger)" }}
            >
              {deleteSubmitting ? "Deleting…" : "Delete account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
