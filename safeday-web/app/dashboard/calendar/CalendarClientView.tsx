"use client";

import { useState } from "react";
import { Rocky, type RockyMood } from "@/components/mascot/Rocky";
import type { Incident } from "@/lib/types";

export function CalendarClientView({ incidents }: { incidents: Incident[] }) {
    // Generate this week's dates dynamically based on "today"
    const [selectedDateStr, setSelectedDateStr] = useState(new Date().toDateString());

    // Create an array for the last 7 days
    const thisWeek = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    const selectedDate = new Date(selectedDateStr);
    const selectedIncidents = incidents.filter(i => new Date(i.created_at).toDateString() === selectedDateStr);

    const hasCrit = selectedIncidents.some(i => i.severity === "critical" || i.severity === "high");
    const hasMed = selectedIncidents.some(i => i.severity === "medium");

    let mood: RockyMood = "happy";
    let summaryText = "Rocky didn't notice any incidents today. Overall, emotional state was calm and positive.";
    if (selectedIncidents.length === 0) {
        summaryText = "Rocky didn't notice any incidents. Everything looks good and peaceful.";
    } else if (hasCrit) {
        mood = "concerned";
        const critCount = selectedIncidents.filter(i => i.severity === "critical" || i.severity === "high").length;
        summaryText = `Rocky noticed ${critCount} critical/high priority alert(s). Overall, emotional state was stressed.`;
    } else if (hasMed) {
        mood = "sleepy";
        const medCount = selectedIncidents.filter(i => i.severity === "medium").length;
        summaryText = `Rocky noticed ${medCount} medium priority alert(s). Overall, emotional state was somewhat normal but needed attention.`;
    }

    return (
        <section className="card-soft bg-white/40 backdrop-blur-md p-6 md:p-8 border border-white/50">
            <h3 className="text-lg font-bold text-slate-800 mb-6">This Week's Breakdown</h3>
            <div className="grid grid-cols-7 gap-2 md:gap-4">
                {thisWeek.map((d) => {
                    const dateStr = d.toDateString();
                    const active = dateStr === selectedDateStr;
                    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
                    const dateObjNum = d.getDate();

                    const dayIncidents = incidents.filter(i => new Date(i.created_at).toDateString() === dateStr);
                    const dayCrit = dayIncidents.some(i => i.severity === "critical" || i.severity === "high");
                    const dayMed = dayIncidents.some(i => i.severity === "medium");
                    let dMood: RockyMood = "happy";
                    if (dayCrit) dMood = "concerned";
                    else if (dayMed) dMood = "sleepy";

                    return (
                        <div
                            key={dateStr}
                            onClick={() => setSelectedDateStr(dateStr)}
                            className={`flex flex-col items-center p-3 rounded-2xl transition-all cursor-pointer card-hover ${active ? 'bg-slate-800 text-white shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:scale-[1.02]'}`}
                        >
                            <span className="text-xs font-bold mb-1">{dayLabel}</span>
                            <span className={`text-lg font-bold ${active ? 'text-white' : 'text-slate-800'}`}>{dateObjNum}</span>

                            <div className="mt-3 relative">
                                <Rocky mood={dMood} className="scale-75 origin-top" />
                                {active && <div className="absolute inset-0 ring-4 ring-slate-400/20 rounded-full animate-pulse"></div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">
                    Detailed Insights for {selectedDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })}
                </h4>
                {selectedIncidents.length === 0 ? (
                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 text-center flex flex-col items-center justify-center min-h-[160px] gap-4">
                        <Rocky mood="sleepy" className="scale-90 opacity-80" />
                        <p className="text-sm font-semibold text-slate-500">
                            {summaryText}
                        </p>
                    </div>
                ) : (
                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                        <p className="text-sm font-medium text-amber-900 mb-4">
                            <strong className="font-bold block mb-1">Summary:</strong> {summaryText}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                            {selectedIncidents.map(inc => {
                                const isHigh = inc.severity === "critical" || inc.severity === "high";
                                return (
                                    <div key={inc.id} className="bg-white/80 p-3 rounded-xl border border-amber-100 flex justify-between items-center text-xs shadow-sm">
                                        <div className="flex gap-2 items-center">
                                            <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                            <span className="font-bold text-slate-700 capitalize w-24 truncate">{inc.event_type.replace('_', ' ')}</span>
                                            <span className="font-medium text-slate-500 hidden sm:inline">{inc.summary}</span>
                                        </div>
                                        <span className="text-slate-400 font-bold shrink-0">{new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
