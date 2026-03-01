import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { event_type, sensor_data, audio_base64, audio_content_type, reported_lat, reported_lng, reported_address } = body;

    if (!event_type || !sensor_data) {
      return NextResponse.json(
        { error: "event_type and sensor_data are required" },
        { status: 400 }
      );
    }

    const sensorDataWithLocation = { ...sensor_data };
    if (typeof reported_lat === "number" && typeof reported_lng === "number") {
      (sensorDataWithLocation as Record<string, unknown>).reported_location = {
        lat: reported_lat,
        lng: reported_lng,
        ...(reported_address && { address: reported_address }),
      };
    }

    const userId = session.user.id;
    const incidentId = crypto.randomUUID();
    let audioUrl: string | null = null;

    const supabaseAdmin = getSupabaseAdmin();

    if (audio_base64) {
      const buffer = Buffer.from(audio_base64, "base64");
      const contentType = audio_content_type || "audio/webm";
      const ext = contentType.includes("wav") ? "wav" : "webm";
      const path = `${userId}/${incidentId}.${ext}`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from("audio-clips")
        .upload(path, buffer, { contentType, upsert: false });

      if (!uploadErr) audioUrl = path;
    }

    const { data: incident, error } = await supabaseAdmin
      .from("incidents")
      .insert({
        id: incidentId,
        user_id: userId,
        event_type,
        sensor_data: sensorDataWithLocation,
        audio_url: audioUrl,
        status: "pending",
        is_simulation: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ incident });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
