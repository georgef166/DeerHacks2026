import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ParentDashboardLayout } from "@/components/layout/ParentDashboardLayout";
import { Rocky, type RockyMood } from "@/components/mascot/Rocky";
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

    const daysOpen = [
        { day: "Mon", date: "10", active: false },
        { day: "Tue", date: "11", active: false },
        { day: "Wed", date: "12", active: false },
        { day: "Thu", date: "13", active: false },
        { day: "Fri", date: "14", active: true }, // "Today"
        { day: "Sat", date: "15", active: false },
        { day: "Sun", date: "16", active: false },
    ];

    return (
        <ParentDashboardLayout currentPath="/dashboard#calendar" userName={session.user.email?.split('@')[0] || "Parent"}>

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

            <section className="card-soft bg-white/40 backdrop-blur-md p-6 md:p-8 border border-white/50">
                <h3 className="text-lg font-bold text-slate-800 mb-6">This Week's Breakdown</h3>
                <div className="grid grid-cols-7 gap-2 md:gap-4">
                    {daysOpen.map((d) => (
                        <div
                            key={d.day}
                            className={`flex flex-col items-center p-3 rounded-2xl transition-colors cursor-pointer card-hover ${d.active ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            <span className="text-xs font-bold mb-1">{d.day}</span>
                            <span className={`text-lg font-bold ${d.active ? 'text-white' : 'text-slate-800'}`}>{d.date}</span>

                            <div className="mt-3">
                                <Rocky mood={d.active ? 'concerned' : 'happy'} className="scale-75 origin-top" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Detailed Insights for Friday, 14th</h4>
                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                        <p className="text-sm font-medium text-amber-900 mb-2">
                            <strong className="font-bold">Summary:</strong> Rocky noticed 1 critical alert today involving a rapid heart rate spike and audio anomaly. Overall, emotional state was stressed.
                        </p>
                    </div>
                </div>
            </section>

        </ParentDashboardLayout>
    );
}
