const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

export interface TranscriptionResult {
  text: string;
  language_code: string;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not configured. Add it to .env.local."
    );
  }

  const ext = mimeType.includes("wav") ? "wav" : "webm";
  const uint8 = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8], { type: mimeType });

  const form = new FormData();
  form.append("file", blob, `recording.${ext}`);
  form.append("model_id", "scribe_v2");
  form.append("tag_audio_events", "false");

  const res = await fetch(ELEVENLABS_STT_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[elevenlabs] STT failed:", res.status, body);
    throw new Error(`ElevenLabs STT error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  return {
    text: data.text ?? "",
    language_code: data.language_code ?? "en",
  };
}
