import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Incident, SensorData } from "@/lib/types";
import { AnalyzeButton } from "./AnalyzeButton";

function severityConfig(severity: string) {
  switch (severity) {
    case "critical":
      return { cls: "bg-rose-500/15 text-rose-400 ring-rose-500/20", label: "Critical" };
    case "high":
      return { cls: "bg-rose-500/10 text-rose-400 ring-rose-500/15", label: "High" };
    case "medium":
      return { cls: "bg-amber-500/10 text-amber-400 ring-amber-500/15", label: "Medium" };
    case "low":
      return { cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/15", label: "Low" };
    default:
      return { cls: "bg-zinc-800 text-zinc-400 ring-zinc-700", label: severity };
  }
}

function SensorSection({ data }: { data: SensorData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {data.heart_rate && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Heart Rate
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-100">
            {data.heart_rate.bpm}
            <span className="ml-1 text-xs font-normal text-zinc-600">BPM</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-600">
            <span>Baseline: {data.heart_rate.baseline}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                data.heart_rate.elevated
                  ? "bg-rose-500/10 text-rose-400 ring-rose-500/15"
                  : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/15"
              }`}
            >
              {data.heart_rate.elevated ? "Elevated" : "Normal"}
            </span>
          </div>
        </div>
      )}

      {data.accelerometer && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Accelerometer
            </span>
          </div>
          <p
            className={`mt-3 text-base font-semibold ${
              data.accelerometer.fall_detected ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {data.accelerometer.fall_detected ? "Fall Detected" : "No Fall"}
          </p>
          <div className="mt-2 space-y-0.5 text-[11px] text-zinc-600">
            {data.accelerometer.magnitude_g != null && (
              <p>Impact: {data.accelerometer.magnitude_g}g</p>
            )}
            {data.accelerometer.axis && <p>Axis: {data.accelerometer.axis}</p>}
          </div>
        </div>
      )}

      {data.audio && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Audio
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-100">
            {data.audio.level_db}
            <span className="ml-1 text-xs font-normal text-zinc-600">dB</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-600">
            {data.audio.duration_sec != null && (
              <span>{data.audio.duration_sec}s</span>
            )}
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                data.audio.anomaly
                  ? "bg-rose-500/10 text-rose-400 ring-rose-500/15"
                  : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/15"
              }`}
            >
              {data.audio.anomaly ? "Anomaly" : "Normal"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default async function EventDetailPage({
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

  const incident = data as Incident;
  const sev = severityConfig(incident.severity);

  let audioUrl: string | null = null;
  if (incident.audio_url) {
    const { data: signed } = await supabaseAdmin.storage
      .from("audio-clips")
      .createSignedUrl(incident.audio_url, 3600);
    audioUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/80 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/dashboard"
            className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"
          >
            &larr; Dashboard
          </Link>
          <a
            href="/auth/logout"
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
          >
            Sign out
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        {/* Header */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <time>{new Date(incident.created_at).toLocaleString()}</time>
                {incident.is_simulation && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500">
                    Sim
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-lg font-semibold text-zinc-100">
                {incident.summary ??
                  `${incident.event_type.replace(/_/g, " ")} event`}
              </h1>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${sev.cls}`}
            >
              {sev.label}
            </span>
          </div>

          {incident.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {incident.categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
                >
                  {cat.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sensors */}
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Sensor Readings
          </h3>
          <SensorSection data={incident.sensor_data} />
        </section>

        {/* Audio */}
        {audioUrl && (
          <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Captured Audio
            </h3>
            <audio controls src={audioUrl} className="w-full" />
          </section>
        )}

        {/* Transcript */}
        {incident.transcript && (
          <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Transcript
            </h3>
            <blockquote className="rounded-lg border-l-2 border-emerald-500/30 bg-zinc-950/60 p-4 text-sm leading-relaxed text-zinc-300 italic">
              {incident.transcript}
            </blockquote>
          </section>
        )}

        {/* Actions */}
        {incident.suggested_actions.length > 0 && (
          <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Suggested Actions
            </h3>
            <ul className="space-y-2">
              {incident.suggested_actions.map((action, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-950/60 p-3.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                    {i + 1}
                  </span>
                  <span className="text-sm text-zinc-300">{action}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Pending */}
        {incident.status === "pending" && (
          <section className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5">
            <p className="mb-3 text-xs text-amber-400/80">
              This incident has not been analyzed yet. Run AI analysis to
              generate a transcript, severity rating, and suggested actions.
            </p>
            <AnalyzeButton incidentId={incident.id} />
          </section>
        )}
      </main>
    </div>
  );
}
