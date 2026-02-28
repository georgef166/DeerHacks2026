import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/elevenlabs";
import { filterTranscript } from "@/lib/keyword-filter";
import { analyzeWithVultr } from "@/lib/vultr";
import type { AnalysisResult } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { audio_base64, audio_content_type, prev_audio_base64 } = body;

    if (!audio_base64) {
      return NextResponse.json(
        { error: "audio_base64 is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const buffer = Buffer.from(audio_base64, "base64");
    const mimeType = audio_content_type || "audio/webm";

    // Layer 1: Transcribe with ElevenLabs
    const sttResult = await transcribeAudio(buffer, mimeType);
    const transcript = sttResult.text.trim();

    if (!transcript || transcript.length < 3) {
      return NextResponse.json({
        action: "skip",
        reason: "No speech detected",
        transcript: "",
      });
    }

    // Layer 2: Keyword pre-filter (instant, free, unlimited)
    const filter = filterTranscript(transcript);

    if (!filter.flagged) {
      return NextResponse.json({
        action: "skip",
        reason: "Transcript is benign (keyword filter)",
        transcript,
        filter_score: filter.score,
      });
    }

    // Layer 3: LLM analysis (Vultr only — no Gemini fallback for dashcam)
    const sensorData = {
      heart_rate: { bpm: 85, elevated: false, baseline: 82 },
      accelerometer: { fall_detected: false },
      audio: { level_db: 70, anomaly: true, duration_sec: 30 },
    };

    let analysis: AnalysisResult;

    try {
      analysis = await analyzeWithVultr("audio_anomaly", sensorData, transcript);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[monitor/audio] Vultr analysis failed:", msg);

      // Keyword filter already flagged this, so create incident with filter data
      analysis = {
        severity: filter.score >= 6 ? "high" : "medium",
        summary: `Audio flagged by keyword detection: ${[...filter.matched_phrases, ...filter.matched_words].join(", ")}. ${filter.has_profanity ? "Profanity detected." : ""} LLM analysis unavailable.`,
        categories: filter.has_profanity ? ["conflict", "distress"] : ["distress"],
        suggested_actions: [
          "Check on your child immediately",
          "Ask them about their current situation",
          "Listen to the audio recording for full context",
          "Contact their teacher or caregiver if unreachable",
        ],
        transcript,
      };
    }

    // If LLM says it's actually fine, trust it over the keyword filter
    const dominated = ["false_positive", "normal"];
    const isBenign =
      analysis.severity === "low" &&
      analysis.categories.every((c) => dominated.includes(c));

    if (isBenign) {
      return NextResponse.json({
        action: "skip",
        reason: "LLM determined audio is benign (keyword false positive)",
        transcript,
        severity: analysis.severity,
        categories: analysis.categories,
        filter_score: filter.score,
      });
    }

    // Create incident with combined audio (prev chunk + current)
    const supabaseAdmin = getSupabaseAdmin();
    const incidentId = crypto.randomUUID();

    const ext = mimeType.includes("wav") ? "wav" : "webm";
    let audioUrl: string | null = null;

    if (prev_audio_base64) {
      const prevBuf = Buffer.from(prev_audio_base64, "base64");
      const combinedBuf = Buffer.concat([prevBuf, buffer]);
      const storagePath = `${userId}/${incidentId}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("audio-clips")
        .upload(storagePath, combinedBuf, { contentType: mimeType, upsert: false });
      if (!uploadErr) audioUrl = storagePath;
    } else {
      const storagePath = `${userId}/${incidentId}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("audio-clips")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
      if (!uploadErr) audioUrl = storagePath;
    }

    const { data: incident, error: insertErr } = await supabaseAdmin
      .from("incidents")
      .insert({
        id: incidentId,
        user_id: userId,
        event_type: "audio_anomaly",
        sensor_data: sensorData,
        audio_url: audioUrl,
        transcript,
        severity: analysis.severity,
        summary: analysis.summary,
        categories: analysis.categories,
        suggested_actions: analysis.suggested_actions,
        status: "analyzed",
        is_simulation: true,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      action: "incident_created",
      incident,
      transcript,
      analysis,
      filter_score: filter.score,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Monitor failed";
    console.error("[monitor/audio] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
