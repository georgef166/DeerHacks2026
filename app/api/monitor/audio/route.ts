import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/elevenlabs";
import { analyzeIncident } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { audio_base64, audio_content_type } = body;

    if (!audio_base64) {
      return NextResponse.json(
        { error: "audio_base64 is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const buffer = Buffer.from(audio_base64, "base64");
    const mimeType = audio_content_type || "audio/webm";

    const sttResult = await transcribeAudio(buffer, mimeType);
    const transcript = sttResult.text.trim();

    if (!transcript || transcript.length < 3) {
      return NextResponse.json({
        action: "skip",
        reason: "No speech detected",
        transcript: "",
      });
    }

    const sensorData = {
      heart_rate: { bpm: 85, elevated: false, baseline: 82 },
      accelerometer: { fall_detected: false },
      audio: { level_db: 70, anomaly: true, duration_sec: 30 },
    };

    const analysis = await analyzeIncident("audio_anomaly", sensorData, transcript);

    const dominated = ["false_positive", "normal"];
    const isBenign =
      analysis.severity === "low" &&
      analysis.categories.every((c) => dominated.includes(c));

    if (isBenign) {
      return NextResponse.json({
        action: "skip",
        reason: "Audio is benign",
        transcript,
        severity: analysis.severity,
        categories: analysis.categories,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const incidentId = crypto.randomUUID();

    const ext = mimeType.includes("wav") ? "wav" : "webm";
    const storagePath = `${userId}/${incidentId}.${ext}`;
    let audioUrl: string | null = null;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("audio-clips")
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (!uploadErr) audioUrl = storagePath;

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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Monitor failed";
    console.error("[monitor/audio] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
