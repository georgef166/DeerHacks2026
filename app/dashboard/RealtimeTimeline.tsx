"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Incident, SensorData } from "@/lib/types";

function formatBpm(sensor: SensorData): string {
  return sensor?.heart_rate?.bpm != null ? `${sensor.heart_rate.bpm} BPM` : "";
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-rose-500/15 text-rose-400 ring-rose-500/20";
    case "high":
      return "bg-rose-500/10 text-rose-400 ring-rose-500/15";
    case "medium":
      return "bg-amber-500/10 text-amber-400 ring-amber-500/15";
    case "low":
      return "bg-emerald-500/10 text-emerald-400 ring-emerald-500/15";
    default:
      return "bg-zinc-800 text-zinc-400 ring-zinc-700";
  }
}

function severityDot(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-rose-500 shadow-rose-500/40 shadow-sm";
    case "high":
      return "bg-rose-400";
    case "medium":
      return "bg-amber-400";
    case "low":
      return "bg-emerald-400";
    default:
      return "bg-zinc-600";
  }
}

const EVENT_LABELS: Record<string, string> = {
  heart_rate: "Heart Rate Alert",
  fall: "Fall Detected",
  audio_anomaly: "Audio Distress",
  combined: "Multi-Signal Emergency",
};

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "heart_rate":
      return (
        <svg className="h-3.5 w-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      );
    case "fall":
      return (
        <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "audio_anomaly":
      return (
        <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      );
    case "combined":
      return (
        <svg className="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
        </svg>
      );
    default:
      return (
        <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

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
  const highCount = todaysIncidents.filter(
    (i) => i.severity === "high" || i.severity === "critical"
  ).length;
  const pendingCount = todaysIncidents.filter(
    (i) => i.status === "pending"
  ).length;

  return (
    <>
      {/* Stat cards */}
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Events Today",
            value: todaysIncidents.length,
            color: "text-zinc-100",
          },
          {
            label: "High Priority",
            value: highCount,
            color: highCount > 0 ? "text-rose-400" : "text-zinc-100",
            pulse: highCount > 0,
          },
          {
            label: "Pending Analysis",
            value: pendingCount,
            color: pendingCount > 0 ? "text-amber-400" : "text-zinc-100",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium tracking-wide text-zinc-500">
                {stat.label}
              </p>
              {stat.pulse && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" style={{ animation: "subtlePulse 2s infinite" }} />
              )}
            </div>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">
          Today&apos;s Timeline
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animation: "subtlePulse 2s infinite" }} />
          Live
        </div>
      </div>

      {todaysIncidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/60">
            <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788m13.788 0c3.808 3.808 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-300">No events today</p>
          <p className="mt-1 text-xs text-zinc-600">
            Open the Simulation Studio to record audio or run a demo scenario.
          </p>
          <Link
            href="/simulate"
            className="mt-5 inline-block rounded-lg bg-emerald-500 px-5 py-2 text-xs font-medium text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.97]"
          >
            Open Simulation Studio
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {todaysIncidents.map((incident, idx) => (
            <Link
              key={incident.id}
              href={`/events/${incident.id}`}
              className="group flex items-start gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700/60 hover:bg-zinc-900/70"
              style={{
                animationDelay: `${idx * 40}ms`,
                animation: "fadeSlideIn 0.3s ease-out both",
              }}
            >
              <div className="flex flex-col items-center pt-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${severityDot(incident.severity)}`}
                />
                {idx < todaysIncidents.length - 1 && (
                  <span className="mt-1.5 h-full w-px bg-zinc-800/60" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <EventIcon type={incident.event_type} />
                  <span className="text-sm font-medium text-zinc-200">
                    {EVENT_LABELS[incident.event_type] ?? incident.event_type}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {new Date(incident.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {incident.summary ?? "Awaiting analysis..."}
                </p>
                {formatBpm(incident.sensor_data) && (
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {formatBpm(incident.sensor_data)}
                  </p>
                )}
              </div>

              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${severityBadge(
                  incident.severity
                )}`}
              >
                {incident.severity}
              </span>
            </Link>
          ))}
        </div>
      )}

      {incidents.length > todaysIncidents.length && (
        <p className="mt-8 text-center text-xs text-zinc-600">
          +{incidents.length - todaysIncidents.length} older events
        </p>
      )}
    </>
  );
}
