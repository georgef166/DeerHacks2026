import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Incident, SensorData, ReportedLocation } from "@/lib/types";
import { ActionButton } from "./ActionButton";
import { AnalyzeButton } from "./AnalyzeButton";
import {
  AlertCircle,
  MapPin,
  PhoneCall,
  CheckCircle2,
  MessageCircle,
  Radio,
  PlayCircle,
  Subtitles,
  ChevronRight
} from "lucide-react";

function severityConfig(severity: string) {
  switch (severity) {
    case "critical":
    case "high":
      return { cls: "text-[#ff522b]", label: "Danger Detected", bg: "bg-[#fff0ed]" };
    case "medium":
      return { cls: "text-[#f59e0b]", label: "Warning", bg: "bg-[#fffbeb]" };
    case "low":
    default:
      return { cls: "text-[#10b981]", label: "Notice", bg: "bg-[#ecfdf5]" };
  }
}

function ActionItem({
  step,
  title,
  desc,
  btnText,
  btnIcon: BtnIcon,
  btnColor,
  actionType,
  actionValue,
}: {
  step: number;
  title: string;
  desc: string;
  btnText?: string;
  btnIcon?: any;
  btnColor?: string;
  actionType?: "link" | "prompt" | "notify";
  actionValue?: string;
}) {
  return (
    <div className="flex items-start gap-4 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
      <div className="flex-1">
        <h4 className="text-sm font-bold text-slate-800">
          {step}. {title}
        </h4>
        <ul className="mt-1 ml-4 list-disc text-xs font-medium text-slate-500 space-y-1">
          <li>{desc}</li>
        </ul>
      </div>
      {btnText && BtnIcon && btnColor && (
        <ActionButton
          btnText={btnText}
          icon={<BtnIcon className="w-3.5 h-3.5" />}
          btnColor={btnColor}
          actionType={actionType}
          actionValue={actionValue}
        />
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

  const timeFormatted = new Date(incident.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const dateFormatted = new Date(incident.created_at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const reportedLocation = (incident.sensor_data as SensorData & { reported_location?: ReportedLocation })?.reported_location;
  const hasLocation = reportedLocation && typeof reportedLocation.lat === "number" && typeof reportedLocation.lng === "number";
  const locationLabel = hasLocation
    ? (reportedLocation!.address ?? `${reportedLocation!.lat.toFixed(5)}, ${reportedLocation!.lng.toFixed(5)}`)
    : null;
  const mapSrc = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(reportedLocation!.lng - 0.01)}%2C${(reportedLocation!.lat - 0.01)}%2C${(reportedLocation!.lng + 0.01)}%2C${(reportedLocation!.lat + 0.01)}&layer=mapnik&marker=${reportedLocation!.lat}%2C${reportedLocation!.lng}`
    : null;

  return (
    <div className="min-h-screen bg-paper text-slate-700 font-sans pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-200/50 bg-white/60 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm font-bold text-sky-600 transition-colors hover:text-sky-700 decoration-2 hover:underline underline-offset-4"
          >
            &larr; Home
          </Link>
          <h1 className="text-sm font-bold text-slate-800">Details</h1>
          <div className="w-12" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6 space-y-6">
        {/* Main Alert Card */}
        <div className="card-soft bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-1.5 text-sm font-bold ${sev.cls}`}>
              <AlertCircle className="w-4 h-4" />
              {sev.label}
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-800 mb-1">
            {incident.event_type === "combined" ? "Potential Kidnapping" : incident.event_type.replace(/_/g, " ")}
          </h2>

          <div className="flex flex-col gap-1 text-xs font-semibold text-slate-500 mb-4">
            <p>First Detected: {timeFormatted}, {dateFormatted}</p>
            {locationLabel ? (
              <p className={`flex items-center gap-1 ${sev.cls}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Reported at: {locationLabel}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                Location not reported
              </p>
            )}
          </div>

          {/* Map: only when we have reported location */}
          {mapSrc && (
            <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 overflow-hidden relative border border-slate-200 card-soft">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc}
                title="Reported location"
              />
            </div>
          )}

          <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
            {incident.summary ?? "Awaiting incident processing.."}
          </p>

          {/* Live Transcription Box */}
          {incident.transcript && (
            <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Subtitles className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Transcription</span>
              </div>
              <p className="text-sm font-medium italic text-slate-600">
                "{incident.transcript}"
              </p>
            </div>
          )}

          {/* Audio Playback */}
          {audioUrl && (
            <div className="mb-5 flex flex-col gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-[#ff522b] flex items-center justify-center text-white shadow-sm">
                  <PlayCircle className="w-6 h-6 ml-0.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">Captured Audio Clip</p>
                  <p className="text-xs text-slate-500 font-medium">{timeFormatted}</p>
                </div>
              </div>
              <audio controls src={audioUrl} className="w-full h-12" />
            </div>
          )}

          <Link href={`/events/${incident.id}/live-audio`} className="w-full py-3.5 rounded-xl bg-[#ff522b] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-[#e64a27] transition-all active:scale-[0.98]">
            <Radio className="w-4 h-4 animate-pulse" />
            Listen to live updates
          </Link>
        </div>

        {/* Pending State for AI Analysis */}
        {incident.status === "pending" && (
          <div className="card-soft bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-sm">
            <p className="mb-4 text-sm font-medium text-amber-800">
              This incident has not been fully analyzed. Run AI analysis for transcript and suggested actions.
            </p>
            <AnalyzeButton incidentId={incident.id} />
          </div>
        )}

        {/* Immediate Actions Header */}
        <div className="pt-4">
          <h3 className="text-lg font-bold text-slate-800 px-1">What are immediate actions to take?</h3>
          <p className="text-xs font-medium text-slate-500 px-1 mt-1">
            If you do believe your child had an urgent situation, here are the immediate actions to take.
          </p>
        </div>

        {/* Actions Card */}
        <div className="card-soft bg-white p-5">
          <ActionItem
            step={1}
            title="Stay Calm"
            desc="Take deep breaths. Clear thinking is crucial."
          />
          <ActionItem
            step={2}
            title="Call 911"
            desc="Provide child's name, age, description, and last known location."
            btnText="Call"
            btnIcon={PhoneCall}
            btnColor="bg-[#ff522b]"
            actionType="link"
            actionValue="tel:911"
          />
          <ActionItem
            step={3}
            title="Detail Collection"
            desc="Confirm child's profile. Note last seen clothing, location, and time."
            btnText="Confirm"
            btnIcon={CheckCircle2}
            btnColor="bg-[#2563eb]"
            actionType="prompt"
          />
          <ActionItem
            step={4}
            title="Notify Circle"
            desc="Send pre-set message and child's profile to contacts."
            btnText="Send Msg"
            btnIcon={MessageCircle}
            btnColor="bg-[#10b981]"
            actionType="notify"
          />
          <ActionItem
            step={5}
            title="Contact NCMEC"
            desc="Tap to Call 1-800-THE-LOST"
            btnText="Call"
            btnIcon={PhoneCall}
            btnColor="bg-[#ff522b]"
            actionType="link"
            actionValue="tel:18008435678"
          />
          <ActionItem
            step={6}
            title="Follow-Up"
            desc="Keep phone charged and nearby. Check app for live updates for police."
          />
        </div>
      </main>
    </div>
  );
}
