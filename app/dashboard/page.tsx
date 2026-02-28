import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import type { Incident } from "@/lib/types";
import { RealtimeTimeline } from "./RealtimeTimeline";

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: incidents } = await supabaseAdmin
    .from("incidents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/80 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-zinc-300">SafeDay</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/simulate"
              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-medium text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.97]"
            >
              Simulation Studio
            </Link>
            <a
              href="/auth/logout"
              className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Sign out
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <RealtimeTimeline
          initialIncidents={(incidents ?? []) as Incident[]}
          userId={userId}
        />
      </main>
    </div>
  );
}
