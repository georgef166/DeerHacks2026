"use client";

import React from "react";
import { Rocky } from "../mascot/Rocky";
import { Battery, MapPin, Signal, ShieldCheck, Clock } from "lucide-react";

export function ChildStatusPanel() {
    return (
        <aside className="w-full lg:w-80 flex flex-col gap-6 animate-in fade-in slide-in-from-right duration-700">
            {/* Child Profile Card */}
            <div className="card-soft p-6 bg-white/40 backdrop-blur-md border border-white/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-200/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-sky-300/30 transition-colors duration-500"></div>

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-100 to-white p-1 shadow-inner border border-white/60">
                            <div className="w-full h-full rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                                <Rocky mood="happy" className="scale-125 translate-y-2" />
                            </div>
                        </div>
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-400 border-4 border-white rounded-full shadow-sm"></div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Maryam's SafeDay</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Age 8 • Active Now</p>

                    <div className="mt-6 w-full grid grid-cols-3 gap-2">
                        <div className="bg-white/50 rounded-2xl p-3 border border-white/20 flex flex-col items-center justify-center gap-1">
                            <Battery className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-700">84%</span>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 border border-white/20 flex flex-col items-center justify-center gap-1">
                            <Signal className="w-4 h-4 text-sky-500" />
                            <span className="text-[10px] font-bold text-slate-700">Strong</span>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 border border-white/20 flex flex-col items-center justify-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-700">Safe</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Map Card */}
            <div className="card-soft p-6 bg-white/40 backdrop-blur-md border border-white/50 shadow-sm flex flex-col gap-4 overflow-hidden relative">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        Live Location
                    </h3>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">Real-time</span>
                </div>

                <div className="relative aspect-square rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-inner group">
                    {/* Stylized placeholder map overlay */}
                    <div className="absolute inset-0 bg-[#f8fafc] opacity-50" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                    {/* Stylized Path */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        <path d="M 20 80 Q 40 70 50 50 T 80 20" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                        <circle cx="20" cy="80" r="3" fill="#94a3b8" />

                        {/* Dynamic Location Pin Animation - Fixed for SVG Stability */}
                        <g className="animate-pulse">
                            <circle cx="80" cy="20" r="6" fill="#f43f5e" className="opacity-40" />
                            <circle cx="80" cy="20" r="3" fill="#f43f5e" />
                        </g>
                    </svg>

                    <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-white/50 shadow-lg flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">Sandalwood Park</p>
                            <p className="text-[10px] font-medium text-slate-500 truncate">Updated 2m ago</p>
                        </div>
                    </div>
                </div>

                <button className="w-full py-3 rounded-2xl bg-white/60 hover:bg-white text-xs font-bold text-slate-600 border border-white/50 transition-all hover:shadow-md active:scale-[0.98]">
                    View Full History
                </button>
            </div>

            {/* Safety Perimeter Card */}
            <div className="card-soft p-5 bg-white/40 backdrop-blur-md border border-white/50 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Safety Status</span>
                        <span className="text-sm font-bold text-slate-800">Inside Perimeter</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    Last Check: 04:08 AM
                </div>
            </div>
        </aside>
    );
}
