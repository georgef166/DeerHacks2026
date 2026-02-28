"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ScenarioKey = "heart_rate" | "fall" | "audio_anomaly" | "combined";

interface Scenario {
  key: ScenarioKey;
  label: string;
  description: string;
  event_type: string;
  sensor_data: Record<string, unknown>;
}

interface StepInfo {
  text: string;
  status: "done" | "active" | "pending";
}

const SCENARIOS: Scenario[] = [
  {
    key: "heart_rate",
    label: "Panic Spike",
    description: "Elevated heart rate sustained over multiple readings",
    event_type: "heart_rate",
    sensor_data: {
      heart_rate: { bpm: 128, elevated: true, baseline: 85 },
      accelerometer: { fall_detected: false },
      audio: { level_db: 45, anomaly: false },
    },
  },
  {
    key: "fall",
    label: "Fall Detected",
    description: "Sudden high-G impact on accelerometer",
    event_type: "fall",
    sensor_data: {
      heart_rate: { bpm: 95, elevated: false, baseline: 90 },
      accelerometer: { fall_detected: true, magnitude_g: 2.8, axis: "z" },
      audio: { level_db: 72, anomaly: false },
    },
  },
  {
    key: "audio_anomaly",
    label: "Distress Audio",
    description: "Yelling, crying, or loud disturbance detected",
    event_type: "audio_anomaly",
    sensor_data: {
      heart_rate: { bpm: 88, elevated: false, baseline: 85 },
      accelerometer: { fall_detected: false },
      audio: { level_db: 85, anomaly: true, duration_sec: 12 },
    },
  },
  {
    key: "combined",
    label: "Multi-Signal",
    description: "Fall + heart spike + audio — everything at once",
    event_type: "combined",
    sensor_data: {
      heart_rate: { bpm: 142, elevated: true, baseline: 88 },
      accelerometer: { fall_detected: true, magnitude_g: 3.1, axis: "y" },
      audio: { level_db: 90, anomaly: true, duration_sec: 8 },
    },
  },
];

function ScenarioIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "heart_rate":
      return (
        <svg className={`${cls} text-rose-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      );
    case "fall":
      return (
        <svg className={`${cls} text-amber-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "audio_anomaly":
      return (
        <svg className={`${cls} text-violet-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      );
    case "combined":
      return (
        <svg className={`${cls} text-rose-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
        </svg>
      );
    default:
      return null;
  }
}

export function SimulationPanel() {
  const router = useRouter();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    incidentId: string;
    label: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser!.getByteTimeDomainData(dataArray);

      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.fillStyle = "#f8fafc";
      ctx!.fillRect(0, 0, w, h);

      ctx!.lineWidth = 2;
      ctx!.strokeStyle = "#10b981";
      ctx!.shadowColor = "#10b981";
      ctx!.shadowBlur = 4;
      ctx!.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
        x += sliceWidth;
      }

      ctx!.lineTo(w, h / 2);
      ctx!.stroke();
      ctx!.shadowBlur = 0;
    }

    draw();
  }, []);

  const drawIdleWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawIdleWaveform();
  }, [drawIdleWaveform]);

  function cleanupAudioResources() {
    cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    drawIdleWaveform();
  }

  async function startRecording() {
    setMicError(null);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        cleanupAudioResources();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000
      );
      drawWaveform();
    } catch {
      setMicError("Microphone access denied. Allow mic access and try again.");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  }

  function discardRecording() {
    setAudioBlob(null);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
  }

  function setStep(index: number, text: string, status: StepInfo["status"]) {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = { text, status };
      return next;
    });
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function runPipeline(
    eventType: string,
    sensorData: Record<string, unknown>,
    label: string,
    audio?: Blob
  ) {
    setRunning(true);
    setError(null);
    setResult(null);
    setSteps([
      { text: "Creating incident...", status: "active" },
      { text: "Uploading audio...", status: "pending" },
      { text: "Running AI analysis...", status: "pending" },
      { text: "Done", status: "pending" },
    ]);

    try {
      let audioBase64: string | undefined;
      if (audio) {
        audioBase64 = await blobToBase64(audio);
      }

      const body: Record<string, unknown> = {
        event_type: eventType,
        sensor_data: sensorData,
      };

      if (audioBase64) {
        body.audio_base64 = audioBase64;
        body.audio_content_type = "audio/webm";
      }

      const createRes = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${createRes.status}`);
      }

      const { incident } = await createRes.json();

      setStep(0, "Incident created", "done");
      setStep(
        1,
        audio ? "Audio uploaded to secure storage" : "No audio to upload",
        "done"
      );
      setStep(2, "Running AI analysis (may retry if rate-limited)...", "active");

      const analyzeRes = await fetch(
        `/api/incidents/${incident.id}/analyze`,
        { method: "POST" }
      );

      const analyzeData = await analyzeRes.json().catch(() => ({}));

      if (analyzeRes.ok) {
        setStep(2, "AI analysis complete", "done");
        setStep(3, "Incident ready for review", "done");
      } else {
        const errMsg = analyzeData.error || `HTTP ${analyzeRes.status}`;
        setStep(2, "AI analysis failed", "done");
        setStep(3, "Done", "done");
        setError(`Gemini: ${errMsg}`);
      }

      setResult({ incidentId: incident.id, label });
      discardRecording();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setRunning(false);
    }
  }

  async function submitAudioIncident() {
    if (!audioBlob) return;
    await runPipeline(
      "audio_anomaly",
      {
        heart_rate: { bpm: 92, elevated: false, baseline: 85 },
        accelerometer: { fall_detected: false },
        audio: { level_db: 78, anomaly: true, duration_sec: recordingTime },
      },
      "Live Audio Capture",
      audioBlob
    );
  }

  async function runScenario(scenario: Scenario) {
    await runPipeline(scenario.event_type, scenario.sensor_data, scenario.label);
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-8">
      {/* Live Audio Capture */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/60 card-soft">
        <div className="border-b border-slate-200/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${isRecording ? "bg-rose-500" : "bg-slate-300"
                }`}
              style={isRecording ? { animation: "subtlePulse 1.5s infinite" } : undefined}
            />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Audio Capture
            </h2>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Record from your microphone. Audio is sent to Gemini for
            transcription and safety analysis.
          </p>
        </div>

        <div className="px-6 pt-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={100}
            className="h-20 w-full rounded-xl border border-slate-200/50 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          {!isRecording && !audioBlob && (
            <button
              onClick={startRecording}
              disabled={running}
              className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 active:scale-[0.97] disabled:opacity-50 ring-1 ring-rose-200 card-hover shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Start Recording
            </button>
          )}

          {isRecording && (
            <>
              <span className="font-mono text-base font-bold tabular-nums text-rose-600">
                {formatTime(recordingTime)}
              </span>
              <button
                onClick={stopRecording}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.97] card-hover shadow-sm"
              >
                Stop
              </button>
            </>
          )}

          {!isRecording && audioBlob && (
            <>
              <span className="text-xs font-medium text-slate-500">
                {formatTime(recordingTime)} recorded
              </span>
              {audioPreviewUrl && (
                <audio controls src={audioPreviewUrl} className="h-8 w-44" />
              )}
              <button
                onClick={submitAudioIncident}
                disabled={running}
                className="rounded-xl bg-[#d1fae5] px-4 py-2 text-xs font-bold text-[#065f46] transition-all hover:bg-[#a7f3d0] active:scale-[0.97] disabled:opacity-50 card-hover shadow-sm"
              >
                {running ? "Processing..." : "Analyze Audio"}
              </button>
              <button
                onClick={discardRecording}
                disabled={running}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-50 card-hover shadow-sm"
              >
                Discard
              </button>
            </>
          )}
        </div>

        {micError && (
          <div className="mx-6 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 shadow-sm">
            {micError}
          </div>
        )}
      </section>

      {/* Quick Scenarios */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Scenarios
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => runScenario(s)}
              disabled={running || isRecording}
              className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 text-left transition-all hover:border-slate-300 hover:bg-white active:scale-[0.98] disabled:opacity-50 card-soft card-hover"
            >
              <div className="flex items-center gap-2">
                <ScenarioIcon type={s.key} />
                <span className="text-xs font-bold text-slate-700">
                  {s.label}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-500">
                {s.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Pipeline Progress */}
      {(steps.length > 0 || error) && (
        <section className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 card-soft">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Pipeline Progress
          </h3>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 shadow-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.status === "done" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d1fae5] text-[#065f46]">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {step.status === "active" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d1fae5]">
                    <span className="h-2 w-2 rounded-full bg-[#059669]" style={{ animation: "subtlePulse 1.5s infinite" }} />
                  </span>
                )}
                {step.status === "pending" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  </span>
                )}
                <span
                  className={`text-xs ${step.status === "done"
                      ? "text-slate-500 font-medium"
                      : step.status === "active"
                        ? "font-bold text-[#059669]"
                        : "text-slate-400 font-medium"
                    }`}
                >
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          {result && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d1fae5] text-[#059669]">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div className="text-xs">
                <span className="font-bold text-[#065f46]">
                  {result.label}
                </span>{" "}
                <span className="text-slate-600 font-medium">incident analyzed</span>
                <div className="mt-1 flex gap-3">
                  <a
                    href={`/events/${result.incidentId}`}
                    className="font-bold text-sky-600 underline underline-offset-2 transition-colors hover:text-sky-800"
                  >
                    View Detail
                  </a>
                  <a
                    href="/dashboard"
                    className="font-bold text-sky-600 underline underline-offset-2 transition-colors hover:text-sky-800"
                  >
                    Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
