import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { analyzeIncident } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { bpm, baseline, elevated_duration_sec } = body;

    if (!bpm || !baseline) {
      return NextResponse.json(
        { error: "bpm and baseline are required" },
        { status: 400 }
      );
    }

    const sensorData = {
      heart_rate: { bpm, elevated: true, baseline },
      accelerometer: { fall_detected: false },
      audio: { level_db: 45, anomaly: false },
    };

    const analysis = await analyzeIncident("heart_rate", sensorData);

    const supabaseAdmin = getSupabaseAdmin();
    const incidentId = crypto.randomUUID();

    const { data: incident, error: insertErr } = await supabaseAdmin
      .from("incidents")
      .insert({
        id: incidentId,
        user_id: session.user.id,
        event_type: "heart_rate",
        sensor_data: {
          ...sensorData,
          heart_rate: {
            ...sensorData.heart_rate,
            elevated_duration_sec: elevated_duration_sec ?? 0,
          },
        },
        audio_url: null,
        transcript: "[No audio — triggered by heart rate sensor]",
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

    return NextResponse.json({ incident, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Monitor failed";
    console.error("[monitor/heartrate] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
