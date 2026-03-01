import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Disc2, Mic, Radio, Signal, Volume2 } from "lucide-react";

export default async function LiveAudioPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await requireAuth();
    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
        .from("incidents")
        .select("*")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();

    if (error || !data) notFound();

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans pb-12 overflow-hidden flex flex-col relative">
            {/* Dynamic Background Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '3s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#ff522b]/20 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '2s' }} />
            </div>

            <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-900/60 px-6 py-4 backdrop-blur-xl">
                <div className="mx-auto flex max-w-lg items-center justify-between">
                    <Link
                        href={`/events/${id}`}
                        className="flex items-center gap-1 text-sm font-bold text-slate-400 transition-colors hover:text-white"
                    >
                        <ChevronLeft className="w-5 h-5 -ml-1" />
                        Back to Details
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        Live
                    </div>
                </div>
            </header>

            <main className="flex-1 mx-auto max-w-lg w-full px-4 pt-12 flex flex-col items-center justify-center relative z-10">

                <div className="mb-12 text-center text-slate-400">
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Encrypted Live Audio</h2>
                    <p className="text-sm font-medium">Connecting to secure stream...</p>
                </div>

                {/* Central Radar / Audio Visualization */}
                <div className="relative w-64 h-64 flex items-center justify-center mb-16">
                    {/* Ripples */}
                    <div className="absolute inset-0 border border-rose-500/30 rounded-full animate-[ping_2s_linear_infinite]" />
                    <div className="absolute inset-4 border border-rose-500/20 rounded-full animate-[ping_2.5s_linear_infinite]" />
                    <div className="absolute inset-8 border border-rose-500/10 rounded-full animate-[ping_3s_linear_infinite]" />

                    <div className="w-24 h-24 bg-gradient-to-tr from-rose-600 to-[#ff522b] rounded-full shadow-lg shadow-rose-500/30 flex items-center justify-center relative z-10 animate-pulse">
                        <Mic className="w-8 h-8 text-white relative z-10" />

                        {/* Inner rotating dash */}
                        <div className="absolute inset-[-4px] border-2 border-transparent border-t-white/40 border-r-white/40 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                </div>

                {/* Status Indicators */}
                <div className="w-full bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                            <Signal className="w-4 h-4 text-emerald-400" />
                            Signal Strength
                        </div>
                        <span className="text-emerald-400 text-xs font-bold font-mono">EXCELLENT</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 w-[92%] rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                    </div>
                </div>

                <div className="w-full bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                <Volume2 className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-slate-200 font-bold text-sm">Receiving Audio...</span>
                                <span className="text-slate-500 font-mono text-[10px] tracking-wider uppercase">0.0 KB/s</span>
                            </div>
                        </div>
                        <button className="h-10 px-4 bg-white/5 hover:bg-white/10 transition-colors rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
                            <Disc2 className="w-4 h-4" />
                            RECORD
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
