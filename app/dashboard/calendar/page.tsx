import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ParentDashboardLayout } from "@/components/layout/ParentDashboardLayout";
import { Rocky, type RockyMood } from "@/components/mascot/Rocky";
import { CalendarClientView } from "./CalendarClientView";
import type { Incident } from "@/lib/types";
import { Calendar as CalendarIcon, Activity, AlertCircle, Heart } from "lucide-react";

export default async function CalendarPage() {
    const session = await requireAuth();
    const supabase = getSupabaseAdmin();

    // Fetch incidents for analytics
    const { data: incidentsData } = await supabase
        .from("incidents")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

    const incidents = (incidentsData as Incident[]) || [];

    // Basic Analytics
    const totalAlerts = incidents.length;
    const criticalAlerts = incidents.filter(i => i.severity === "critical" || i.severity === "high").length;
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentAlerts = incidents.filter(i => new Date(i.created_at) > last7Days).length;

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
        <ParentDashboardLayout currentPath="/dashboard/calendar" userName={userName}>

            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6 text-sky-500" />
                    Analytics & History
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                    Review past activity, emotional trends, and detailed logs.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="card-soft bg-white/40 backdrop-blur-md p-5 border border-white/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50/50 flex items-center justify-center text-sky-500 ring-1 ring-sky-100/50">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Events</p>
                        <p className="text-2xl font-bold text-slate-800">{totalAlerts}</p>
                    </div>
                </div>
                <div className="card-soft bg-white/40 backdrop-blur-md p-5 border border-white/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50/50 flex items-center justify-center text-rose-500 ring-1 ring-rose-100/50">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Critical Alerts</p>
                        <p className="text-2xl font-bold text-slate-800">{criticalAlerts}</p>
                    </div>
                </div>
                <div className="card-soft bg-white/40 backdrop-blur-md p-5 border border-white/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5]/50 flex items-center justify-center text-[#059669] ring-1 ring-[#a7f3d0]/50">
                        <Heart className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Weekly Health</p>
                        <p className="text-2xl font-bold text-slate-800">{recentAlerts === 0 ? "Perfect" : "Good"}</p>
                    </div>
                </div>
            </div>

            <CalendarClientView incidents={incidents} />

        </ParentDashboardLayout>
    );
}
