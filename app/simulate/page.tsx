import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { LiveMonitor } from "./LiveMonitor";
import { ParentDashboardLayout } from "@/components/layout/ParentDashboardLayout";
import type { Incident } from "@/lib/types";

export default async function SimulatePage() {
  const session = await requireAuth();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: incidents } = await supabaseAdmin
    .from("incidents")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  let userName = "Parent";
  if (session.user.user_metadata?.full_name) {
    userName = session.user.user_metadata.full_name;
  } else if (session.user.email) {
    userName = session.user.email;
  }
  if (userName.includes("@")) {
    userName = userName.split("@")[0];
  } else {
    userName = userName.split(" ")[0];
  }

  return (
    <ParentDashboardLayout
      currentPath="/simulate"
      userName={userName}
      hideGreeting={true}
      userId={session.user.id}
      initialIncidents={(incidents ?? []) as Incident[]}
    >
      <div className="bg-paper text-slate-700 min-h-screen rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <header className="sticky top-0 z-10 border-b border-slate-200/50 bg-white/60 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="text-sm font-bold text-sky-600 transition-colors hover:text-sky-700 decoration-2 hover:underline underline-offset-4"
            >
              &larr; Dashboard
            </Link>
            <h1 className="text-sm font-bold text-slate-800">Simulation Studio</h1>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="mb-8">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
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
    </ParentDashboardLayout>
  );
}
