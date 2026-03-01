import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Incident } from "@/lib/types";
import { RealtimeTimeline } from "./RealtimeTimeline";
import { ParentDashboardLayout } from "@/components/layout/ParentDashboardLayout";
import { ChildStatusPanel } from "@/components/dashboard/ChildStatusPanel";

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
    <ParentDashboardLayout currentPath="/dashboard" userName={userName} userId={userId} initialIncidents={(incidents ?? []) as Incident[]}>
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 min-w-0">
          <RealtimeTimeline
            initialIncidents={(incidents ?? []) as Incident[]}
            userId={userId}
          />
        </div>
        <ChildStatusPanel />
      </div>
    </ParentDashboardLayout>
  );
}
