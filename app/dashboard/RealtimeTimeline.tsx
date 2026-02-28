"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Incident, SensorData } from "@/lib/types";
import { Rocky, type RockyMood } from "@/components/mascot/Rocky";

function formatBpm(sensor: SensorData): string {
  return sensor?.heart_rate?.bpm != null ? `${sensor.heart_rate.bpm} BPM` : "";
}

const EVENT_LABELS: Record<string, string> = {
  heart_rate: "Heart Rate Alert",
  fall: "Fall Detected",
  audio_anomaly: "Audio Distress",
  combined: "Multi-Signal Emergency",
};

export function RealtimeTimeline({
  initialIncidents,
  userId,
}: {
  initialIncidents: Incident[];
  userId: string;
}) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("incidents-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setIncidents((prev) => [payload.new as Incident, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setIncidents((prev) =>
              prev.map((i) =>
                i.id === (payload.new as Incident).id
                  ? (payload.new as Incident)
                  : i
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const today = new Date().toDateString();
  const todaysIncidents = incidents.filter(
    (i) => new Date(i.created_at).toDateString() === today
  );

  const hasCritical = todaysIncidents.some(i => i.severity === "critical" || i.severity === "high");
  const hasMedium = todaysIncidents.some(i => i.severity === "medium");

  // Determine overall day quality
  let dayQuality = "good";
  if (hasCritical) dayQuality = "concerning";
  else if (hasMedium) dayQuality = "normal";

  const getRockyMood = (quality: string): RockyMood => {
    switch (quality) {
      case "concerning": return "concerned";
      case "normal": return "sleepy";
      default: return "happy";
    }
  };

  const NotificationCard = ({ incident, idx }: { incident: Incident, idx: number }) => {
    const isRed = incident.severity === "critical" || incident.severity === "high";
    const isYellow = incident.severity === "medium";
    const colorClass = isRed
      ? "bg-rose-50 border-rose-200"
      : isYellow
        ? "bg-amber-50 border-amber-200"
        : "bg-emerald-50 border-emerald-200";

    const mood: RockyMood = isRed ? "concerned" : isYellow ? "sleepy" : "happy";
    const titleColor = isRed ? "text-rose-900" : isYellow ? "text-amber-900" : "text-emerald-900";
    const time = new Date(incident.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
      <Link
        href={`/events/${incident.id}`}
        className={`group flex items-start gap-4 rounded-3xl border ${colorClass} bg-white/40 backdrop-blur-md p-6 transition-all duration-300 ease-in-out card-hover shadow-sm`}
        style={{
          animationDelay: `${idx * 40}ms`,
          animation: "fadeSlideIn 0.4s ease-out both",
        }}
      >
        <Rocky mood={mood} className="scale-90 shrink-0 -mt-2" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-sm font-bold tracking-tight ${titleColor} px-3 py-1 bg-white/50 rounded-full border border-current opacity-70`}>
              {EVENT_LABELS[incident.event_type] ?? incident.event_type}
            </span>
            <span className="text-[11px] font-bold text-slate-400 bg-white/50 px-3 py-1.5 rounded-xl border border-slate-100">
              {time}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-3">
            {incident.summary ?? "Rocky is analyzing what happened..."}
          </p>
          {formatBpm(incident.sensor_data) && (
            <div className="inline-flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white/40 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pulse</span>
              <span className="text-xs font-bold text-slate-700">{formatBpm(incident.sensor_data)}</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Daily Summary Card */}
        <div className="card-soft p-8 bg-white/40 backdrop-blur-md border border-white/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Summary</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Today is a calm and positive day.</p>
              </div>
              <Rocky mood={getRockyMood(dayQuality)} className="scale-110" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "EMOTION", val: dayQuality === "good" ? "Calm" : dayQuality === "normal" ? "Normal" : "Tense", icon: "🧠" },
                { label: "ACTIVITY", val: "Normal", icon: "🏃" },
                { label: "ALERTS", val: todaysIncidents.length.toString(), icon: "🔔" },
                { label: "SLEEP", val: "8h 12m", icon: "💤" },
              ].map((item) => (
                <div key={item.label} className="bg-white/50 rounded-2xl p-4 border border-white/20 flex flex-col items-center text-center">
                  <span className="text-lg mb-1">{item.icon}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-bold text-slate-700">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Redesigned Activity Calendar Section */}
        <Link href="/dashboard/calendar" className="block focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-3xl h-full">
          <section id="calendar" className="card-soft p-6 bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl flex flex-col relative overflow-hidden transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl cursor-pointer h-full min-h-[320px]">
            {/* Tape Decorations */}
            <div className="absolute -top-1 left-12 w-8 h-12 bg-amber-100/60 backdrop-blur-sm border-x border-amber-200/30 rotate-2 z-20 shadow-sm"></div>
            <div className="absolute -top-1 right-12 w-8 h-12 bg-amber-100/60 backdrop-blur-sm border-x border-amber-200/30 -rotate-2 z-20 shadow-sm"></div>

            <div className="flex flex-col items-center mb-6 relative z-10 border-b border-slate-200/50 pb-3 border-dashed">
              <h2 className="text-lg font-bold tracking-tight text-slate-800">Record</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white/40 px-3 py-1.5 rounded-xl border border-white/40 mt-1">
                <span>&larr;</span>
                <span className="text-slate-600">Feb 2026</span>
                <span>&rarr;</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-3 gap-x-1 relative z-10">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mb-1">{day}</span>
              ))}

              {/* Padding for month start (assuming month starts on certain day for demo) */}
              {[...Array(4)].map((_, i) => <div key={`pad-${i}`} />)}

              {[
                { date: 1, mood: "happy", color: "bg-emerald-400" },
                { date: 2, mood: "sleepy", color: "bg-amber-400" },
                { date: 3, mood: "happy", color: "bg-emerald-400" },
                { date: 4, mood: "concerned", color: "bg-rose-400" },
                { date: 5, mood: "happy", color: "bg-emerald-400" },
                { date: 6, mood: "sleepy", color: "bg-amber-400" },
                { date: 7, mood: "happy", color: "bg-emerald-400" },
                { date: 8, mood: "happy", color: "bg-emerald-400" },
                { date: 9, mood: "sleepy", color: "bg-amber-400" },
                { date: 10, mood: "happy", color: "bg-emerald-400" },
                { date: 11, mood: "concerned", color: "bg-rose-400" },
                { date: 12, mood: "happy", color: "bg-emerald-400" },
                { date: 13, mood: "happy", color: "bg-emerald-400" },
                { date: 14, mood: dayQuality === "good" ? "happy" : dayQuality === "concerning" ? "concerned" : "sleepy", color: dayQuality === "good" ? "bg-emerald-400" : dayQuality === "concerning" ? "bg-rose-400" : "bg-sky-400", active: true },
              ].map((d) => (
                <div key={d.date} className="flex flex-col items-center gap-1.5 relative group">
                  <span className={`text-[9px] font-bold ${d.active ? 'text-sky-600' : 'text-slate-400'} mb-1`}>{d.date}</span>
                  <div className={`w-7 h-7 rounded-full ${d.color} shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 relative ${d.active ? 'ring-2 ring-sky-100 shadow-md' : ''}`}>
                    <Rocky mood={d.mood as RockyMood} className="scale-[0.45] origin-center" />
                    {d.active && (
                      <div className="absolute -inset-1 rounded-full border-2 border-sky-400 animate-pulse opacity-50"></div>
                    )}
                  </div>
                </div>
              ))}

              {/* Future days placeholders */}
              {[...Array(12)].map((_, i) => (
                <div key={`future-${i}`} className="flex flex-col items-center gap-1.5 opacity-20">
                  <span className="text-[9px] font-bold text-slate-400 mb-1">{15 + i}</span>
                  <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300"></div>
                </div>
              ))}
            </div>

          </section>
        </Link>
      </div>

      <div id="alerts" className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Recent Notifications</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-white/50 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ animation: "subtlePulse 2s infinite" }} />
          <span className="text-xs font-semibold text-slate-500">Live feed connected</span>
        </div>
      </div>

      {
        todaysIncidents.length === 0 ? (
          <div className="card-soft p-12 text-center bg-white/40 backdrop-blur-md border border-white/50">
            <Rocky mood="sleepy" className="scale-100 opacity-60 mb-6 mx-auto" />
            <p className="text-lg font-semibold text-slate-700">All quiet here.</p>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Rocky is resting. Open the Simulation Studio to run a demo scenario.
            </p>
            <Link
              href="/simulate"
              className="mt-6 inline-block rounded-2xl bg-[#d1fae5] px-6 py-3 text-sm font-semibold text-[#065f46] transition-all hover:bg-[#a7f3d0] active:scale-[0.97] card-hover shadow-sm"
            >
              Open Simulation Studio
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {todaysIncidents.map((incident, idx) => (
              <NotificationCard key={incident.id} incident={incident} idx={idx} />
            ))}
          </div>
        )
      }

      {
        incidents.length > todaysIncidents.length && (
          <div className="mt-12 text-center">
            <button className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm card-hover">
              View {incidents.length - todaysIncidents.length} older notifications in folders
            </button>
          </div>
        )
      }
    </>
  );
}
