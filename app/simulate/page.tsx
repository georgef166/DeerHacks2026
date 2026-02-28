import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { LiveMonitor } from "./LiveMonitor";

export default async function SimulatePage() {
  await requireAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/80 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"
            >
              &larr; Dashboard
            </Link>
            <span className="hidden h-3.5 w-px bg-zinc-800 sm:block" />
            <span className="hidden text-xs font-medium text-zinc-500 sm:block">
              SafeDay Companion
            </span>
          </div>
          <a
            href="/auth/logout"
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
          >
            Sign out
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <LiveMonitor />
      </main>
    </div>
  );
}
