"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Activity, BellRing, Moon } from "lucide-react";
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

  const [selectedDateObj, setSelectedDateObj] = useState(new Date());
  const selectedDateStr = selectedDateObj.toDateString();
  const displayedIncidents = incidents.filter(
    (i) => new Date(i.created_at).toDateString() === selectedDateStr
  );

  const hasCritical = displayedIncidents.some(i => i.severity === "critical" || i.severity === "high");
  const hasMedium = displayedIncidents.some(i => i.severity === "medium");

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

  const IncidentFolder = ({ incident, idx }: { incident: Incident; idx: number }) => {
    const isHigh = incident.severity === "critical" || incident.severity === "high";
    const isMedium = incident.severity === "medium";
    const folderBg = isHigh
      ? "bg-rose-100/95 border-rose-200/80"
      : isMedium
        ? "bg-amber-100/95 border-amber-200/80"
        : "bg-emerald-100/95 border-emerald-200/80";
    const tabBg = isHigh ? "bg-rose-200/90" : isMedium ? "bg-amber-200/90" : "bg-emerald-200/90";
    const time = new Date(incident.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const label = EVENT_LABELS[incident.event_type] ?? incident.event_type;
    const summary = incident.summary ?? "Analyzing...";

    return (
      <Link
        href={`/events/${incident.id}`}
        className={`folder-stack-item relative flex w-full rounded-l-2xl rounded-r-md border-2 ${folderBg} overflow-hidden shadow-md cursor-pointer transition-transform duration-300 hover:-translate-y-4`}
        style={{
          marginTop: idx === 0 ? 0 : -16,
          zIndex: idx,
          animation: "fadeSlideIn 0.4s ease-out both",
          animationDelay: `${idx * 40}ms`,
        }}
      >
        <div className="flex-1 min-w-0 py-8 pl-6 pr-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-slate-600 truncate">{label}</span>
            <span className="text-[10px] font-bold text-slate-500 shrink-0">{time}</span>
          </div>
          <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">{summary}</p>
          {formatBpm(incident.sensor_data) && (
            <p className="mt-2 text-[10px] font-bold text-slate-500">{formatBpm(incident.sensor_data)}</p>
          )}
        </div>
        <div
          className={`w-8 shrink-0 border-l-2 border-white/60 ${tabBg} rounded-r-md self-stretch group flex items-center justify-center`}
          aria-hidden
        >
        </div>
      </Link>
    );
  };

  const year = selectedDateObj.getFullYear();
  const month = selectedDateObj.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startPad = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handlePrevMonth = () => {
    setSelectedDateObj(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setSelectedDateObj(new Date(year, month + 1, 1));
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <div className="card-soft p-8 bg-white/40 backdrop-blur-md border border-white/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Daily Summary</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  {selectedDateStr === new Date().toDateString() ? "Today is" : "This day was"} a {dayQuality === "good" ? "calm and positive" : dayQuality === "normal" ? "normal" : "concerning"} day.
                </p>
              </div>
              <Rocky mood={getRockyMood(dayQuality)} className="scale-110" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "EMOTION", val: dayQuality === "good" ? "Calm" : dayQuality === "normal" ? "Normal" : "Tense", icon: <Brain className="w-5 h-5 text-indigo-400" /> },
                { label: "ACTIVITY", val: displayedIncidents.length > 3 ? "High" : displayedIncidents.length > 0 ? "Moderate" : "Calm", icon: <Activity className="w-5 h-5 text-emerald-400" /> },
                { label: "ALERTS", val: displayedIncidents.length.toString(), icon: <BellRing className="w-5 h-5 text-rose-400" /> },
                { label: "SLEEP", val: hasCritical ? "6h 45m" : hasMedium ? "7h 30m" : "8h 12m", icon: <Moon className="w-5 h-5 text-sky-400" /> },
              ].map((item) => (
                <div key={item.label} className="bg-white/50 rounded-2xl p-4 border border-white/20 flex flex-col items-center text-center">
                  <span className="mb-2">{item.icon}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-bold text-slate-700">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section id="calendar" className="card-soft p-6 bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl flex flex-col relative overflow-hidden transition-all duration-500 hover:shadow-2xl h-full min-h-[320px]">
          <div className="absolute -top-1 left-12 w-8 h-12 bg-amber-100/60 backdrop-blur-sm border-x border-amber-200/30 rotate-2 z-20 shadow-sm"></div>
          <div className="absolute -top-1 right-12 w-8 h-12 bg-amber-100/60 backdrop-blur-sm border-x border-amber-200/30 -rotate-2 z-20 shadow-sm"></div>

          <div className="flex flex-col items-center mb-6 relative z-10 border-b border-slate-200/50 pb-3 border-dashed">
            <h2 className="text-lg font-bold tracking-tight text-slate-800">Record</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white/40 px-3 py-1.5 rounded-xl border border-white/40 mt-1">
              <button onClick={handlePrevMonth} className="hover:text-sky-600 transition-colors cursor-pointer px-1">&larr;</button>
              <span className="text-slate-600 select-none w-16 text-center">{monthNames[month]} {year}</span>
              <button onClick={handleNextMonth} className="hover:text-sky-600 transition-colors cursor-pointer px-1">&rarr;</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-3 gap-x-1 relative z-10">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mb-1">{day}</span>
            ))}

            {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} />)}

            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(year, month, day);
              const dateStr = dateObj.toDateString();
              const isSelected = dateStr === selectedDateStr;

              const dayIncidents = incidents.filter(inc => new Date(inc.created_at).toDateString() === dateStr);
              const isFuture = dateObj > new Date();

              const dayHasCrit = dayIncidents.some(inc => inc.severity === "critical" || inc.severity === "high");
              const dayHasMed = dayIncidents.some(inc => inc.severity === "medium");

              let dMood = "happy";
              let dColor = "bg-emerald-400";
              if (isFuture) {
                dColor = "bg-slate-200";
              } else if (dayHasCrit) {
                dMood = "concerned";
                dColor = "bg-rose-400";
              } else if (dayHasMed) {
                dMood = "sleepy";
                dColor = "bg-amber-400";
              }

              return (
                <button
                  key={day}
                  onClick={() => !isFuture && setSelectedDateObj(dateObj)}
                  className={`flex flex-col items-center gap-1.5 relative group ${isFuture ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
                >
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-sky-600' : 'text-slate-400'} mb-1`}>{day}</span>
                  <div className={`w-7 h-7 rounded-full ${dColor} shadow-sm flex items-center justify-center transition-transform duration-300 ${!isFuture && 'group-hover:scale-110'} relative ${isSelected ? 'ring-2 ring-sky-100 shadow-md' : ''}`}>
                    {!isFuture && <Rocky mood={dMood as RockyMood} className="scale-[0.45] origin-center" />}
                    {isSelected && (
                      <div className="absolute -inset-1 rounded-full border-2 border-sky-400 animate-pulse opacity-50 pointer-events-none"></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div id="alerts" className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Incidents — {selectedDateStr === new Date().toDateString() ? "Today" : selectedDateStr}</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-white/50 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ animation: "subtlePulse 2s infinite" }} />
          <span className="text-xs font-semibold text-slate-500">Live feed connected</span>
        </div>
      </div>

      {
        displayedIncidents.length === 0 ? (
          <div className="card-soft p-12 text-center bg-white/40 backdrop-blur-md border border-white/50">
            <Rocky mood="sleepy" className="scale-100 opacity-60 mb-6 mx-auto" />
            <p className="text-lg font-semibold text-slate-700">No incidents to display.</p>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Rocky is resting.
            </p>
          </div>
        ) : (
          <div className="relative w-full isolate">
            {displayedIncidents.map((incident, idx) => (
              <IncidentFolder key={incident.id} incident={incident} idx={idx} />
            ))}
          </div>
        )
      }
    </>
  );
}
