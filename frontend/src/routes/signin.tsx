import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [{ title: "Sign in — Projektor" }],
  }),
  component: SignIn,
});

function SignIn() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) {
      navigate({ to: "/", search: { deckId: undefined } });
    }
  }, [loading, currentUser, navigate]);

  if (!loading && currentUser) return null;

  async function handleEmailSignIn() {
    if (!email || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate({ to: "/", search: { deckId: undefined } });
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate({ to: "/", search: { deckId: undefined } });
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl text-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Welcome back to Projektor
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/10 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58Z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-2">or</span>
            </div>
          </div>

          {/* Email / Password */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-ink mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/40 transition"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-ink mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSignIn()}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/40 transition"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleEmailSignIn}
            disabled={submitting || !email || !password}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-ink font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

function friendlyError(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: string }).code;
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found"
    ) {
      return "Incorrect email or password.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many attempts. Try again later.";
    }
    if (code === "auth/popup-closed-by-user") {
      return "Sign-in popup was closed.";
    }
  }
  return "Something went wrong. Please try again.";
}
