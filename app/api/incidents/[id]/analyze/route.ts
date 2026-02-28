import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/elevenlabs";
import { analyzeIncident } from "@/lib/gemini";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data: incident, error: fetchErr } = await supabaseAdmin
      .from("incidents")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (fetchErr || !incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    if (incident.status === "analyzed") {
      return NextResponse.json({ message: "Already analyzed", incident });
    }

    let transcript: string | undefined;

    if (incident.audio_url) {
      const { data: audioData, error: dlErr } = await supabaseAdmin.storage
        .from("audio-clips")
        .download(incident.audio_url);

      if (dlErr) {
        console.error("[analyze] Audio download failed:", dlErr.message);
      }

      if (audioData) {
        const arrayBuffer = await audioData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = incident.audio_url.endsWith(".wav")
          ? "audio/wav"
          : "audio/webm";

        console.log(
          `[analyze] Transcribing ${buffer.length} bytes (${mimeType}) via ElevenLabs...`
        );

        const sttResult = await transcribeAudio(buffer, mimeType);
        transcript = sttResult.text;

        console.log(
          `[analyze] Transcript (${sttResult.language_code}): "${transcript.slice(0, 120)}..."`
        );
      }
    }

    console.log("[analyze] Running Gemini safety analysis...");

    const analysis = await analyzeIncident(
      incident.event_type,
      incident.sensor_data,
      transcript
    );

    const { error: updateErr } = await supabaseAdmin
      .from("incidents")
      .update({
        severity: analysis.severity,
        summary: analysis.summary,
        categories: analysis.categories,
        suggested_actions: analysis.suggested_actions,
        transcript: transcript || "[No audio captured]",
        status: "analyzed",
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ incident_id: id, analysis, transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[analyze] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
