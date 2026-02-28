import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { LiveMonitor } from "./LiveMonitor";

export default async function SimulatePage() {
  await requireAuth();

  return (
    <div className="min-h-screen bg-transparent text-slate-700">
      <header className="sticky top-0 z-10 border-b border-slate-200/50 bg-white/40 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              &larr; Dashboard
            </Link>
            <span className="hidden h-3.5 w-px bg-slate-300 sm:block" />
            <span className="hidden text-xs font-medium text-slate-500 sm:block">
              SafeDay Companion
            </span>
          </div>
          <a
            href="/auth/logout"
            className="text-xs text-slate-500 transition-colors hover:text-slate-800"
          >
            Sign out
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-800">
            Live Monitoring
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Start monitoring to enable heart rate tracking and audio dashcam.
            Trigger panic spike or fall detection to simulate events.
          </p>
        </div>
        <LiveMonitor />
      </main>
    </div>
  );
}
