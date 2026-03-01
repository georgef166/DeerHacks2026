"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignup() {
    setError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 bg-transparent backdrop-blur-xl">
      <div className="w-full max-w-sm card-soft p-8 bg-white/40">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d1fae5] ring-1 ring-[#a7f3d0] shadow-sm text-[#065f46]">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            Create account
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500">
            Start monitoring with Rocky
          </p>
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 card-hover shadow-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100 shadow-sm"
              placeholder="parent@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100 shadow-sm"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="mt-2 w-full rounded-xl bg-[#d1fae5] py-3 text-sm font-bold tracking-wide text-[#065f46] transition-all hover:bg-[#a7f3d0] active:scale-[0.98] disabled:opacity-50 card-hover shadow-sm"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-sky-600 transition-colors hover:text-sky-700 underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
