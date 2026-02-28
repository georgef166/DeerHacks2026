"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Heart-rate simulation config                                       */
/* ------------------------------------------------------------------ */
const HR_BASELINE = 82;
const HR_SPIKE_THRESHOLD = 120;
const HR_SPIKE_HOLD_SEC = 10;
const HR_TICK_MS = 1000;

function nextBpm(prev: number, spiking: boolean): number {
  if (spiking) {
    const drift = (Math.random() - 0.3) * 6;
    return Math.round(Math.min(180, Math.max(HR_SPIKE_THRESHOLD, prev + drift)));
  }
  const drift = (Math.random() - 0.5) * 4;
  return Math.round(Math.min(110, Math.max(60, prev + drift)));
}

/* ------------------------------------------------------------------ */
/*  Audio dashcam config                                               */
/* ------------------------------------------------------------------ */
const AUDIO_CHUNK_SEC = 30;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AudioCycleLog {
  id: number;
  status: "recording" | "analyzing" | "done";
  result?: "skip" | "incident";
  transcript?: string;
  severity?: string;
  incidentId?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function MonitoringPanel() {
  const router = useRouter();

  /* ---------- heart rate state ---------- */
  const [hrActive, setHrActive] = useState(false);
  const [bpm, setBpm] = useState(HR_BASELINE);
  const [bpmHistory, setBpmHistory] = useState<number[]>([]);
  const [spiking, setSpiking] = useState(false);
  const [elevatedSec, setElevatedSec] = useState(0);
  const [hrIncidents, setHrIncidents] = useState(0);
  const [hrBusy, setHrBusy] = useState(false);
  const hrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elevatedRef = useRef(0);
  const spikingRef = useRef(false);

  /* ---------- audio dashcam state ---------- */
  const [audioActive, setAudioActive] = useState(false);
  const [countdown, setCountdown] = useState(AUDIO_CHUNK_SEC);
  const [cycleLogs, setCycleLogs] = useState<AudioCycleLog[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const cycleIdRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioActiveRef = useRef(false);

  /* ---------- waveform drawing ---------- */
  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser!.getByteTimeDomainData(data);
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.fillStyle = "#09090b";
      ctx!.fillRect(0, 0, w, h);
      ctx!.lineWidth = 2;
      ctx!.strokeStyle = "#34d399";
      ctx!.shadowColor = "#34d399";
      ctx!.shadowBlur = 4;
      ctx!.beginPath();
      const slice = w / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
        x += slice;
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
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#27272a";
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawIdleWaveform();
  }, [drawIdleWaveform]);

  /* ---------- heart rate engine ---------- */
  const triggerHrIncident = useCallback(
    async (currentBpm: number, durationSec: number) => {
      if (hrBusy) return;
      setHrBusy(true);
      try {
        const res = await fetch("/api/monitor/heartrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bpm: currentBpm,
            baseline: HR_BASELINE,
            elevated_duration_sec: durationSec,
          }),
        });
        if (res.ok) {
          setHrIncidents((n) => n + 1);
          router.refresh();
        }
      } catch {
        /* network error — ignore, will retry next threshold crossing */
      } finally {
        setHrBusy(false);
        elevatedRef.current = 0;
        setElevatedSec(0);
      }
    },
    [hrBusy, router]
  );

  function startHeartRate() {
    setSpiking(false);
    spikingRef.current = false;
    setBpm(HR_BASELINE);
    setBpmHistory([]);
    setElevatedSec(0);
    elevatedRef.current = 0;
    setHrActive(true);

    hrTimerRef.current = setInterval(() => {
      setBpm((prev) => {
        const next = nextBpm(prev, spikingRef.current);
        setBpmHistory((h) => [...h.slice(-59), next]);

        if (next >= HR_SPIKE_THRESHOLD) {
          elevatedRef.current += 1;
          setElevatedSec(elevatedRef.current);
          if (elevatedRef.current >= HR_SPIKE_HOLD_SEC) {
            triggerHrIncident(next, elevatedRef.current);
          }
        } else {
          elevatedRef.current = 0;
          setElevatedSec(0);
        }

        return next;
      });
    }, HR_TICK_MS);
  }

  function stopHeartRate() {
    if (hrTimerRef.current) clearInterval(hrTimerRef.current);
    hrTimerRef.current = null;
    setHrActive(false);
  }

  function toggleSpike() {
    const next = !spiking;
    setSpiking(next);
    spikingRef.current = next;
    if (next) setBpm(HR_SPIKE_THRESHOLD + Math.round(Math.random() * 20));
  }

  /* ---------- audio dashcam engine ---------- */
  async function blobToBase64(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  }

  const processAudioChunk = useCallback(
    async (blob: Blob, cycleId: number) => {
      setCycleLogs((prev) =>
        prev.map((l) =>
          l.id === cycleId ? { ...l, status: "analyzing" } : l
        )
      );

      try {
        const b64 = await blobToBase64(blob);
        const res = await fetch("/api/monitor/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio_base64: b64,
            audio_content_type: "audio/webm",
          }),
        });

        const data = await res.json();

        setCycleLogs((prev) =>
          prev.map((l) =>
            l.id === cycleId
              ? {
                  ...l,
                  status: "done",
                  result: data.action === "incident_created" ? "incident" : "skip",
                  transcript: data.transcript || "",
                  severity: data.analysis?.severity || data.severity,
                  incidentId: data.incident?.id,
                  error: data.error,
                }
              : l
          )
        );

        if (data.action === "incident_created") router.refresh();
      } catch (err) {
        setCycleLogs((prev) =>
          prev.map((l) =>
            l.id === cycleId
              ? {
                  ...l,
                  status: "done",
                  result: "skip",
                  error: err instanceof Error ? err.message : "Failed",
                }
              : l
          )
        );
      }
    },
    [router]
  );

  function startAudioDashcam() {
    setMicError(null);
    setCycleLogs([]);
    audioActiveRef.current = true;
    setAudioActive(true);
    beginAudioCycle();
  }

  async function beginAudioCycle() {
    audioChunksRef.current = [];

    try {
      if (!streamRef.current || !streamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        drawWaveform();
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(streamRef.current!, { mimeType });
      mediaRecorderRef.current = recorder;

      const cycleId = ++cycleIdRef.current;
      setCycleLogs((prev) => [
        { id: cycleId, status: "recording" },
        ...prev.slice(0, 9),
      ]);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        processAudioChunk(blob, cycleId);

        if (audioActiveRef.current) {
          beginAudioCycle();
        }
      };

      recorder.start();
      setCountdown(AUDIO_CHUNK_SEC);

      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) return AUDIO_CHUNK_SEC;
          return c - 1;
        });
      }, 1000);

      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, AUDIO_CHUNK_SEC * 1000);
    } catch {
      setMicError("Microphone access denied.");
      setAudioActive(false);
      audioActiveRef.current = false;
    }
  }

  function stopAudioDashcam() {
    audioActiveRef.current = false;
    setAudioActive(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    drawIdleWaveform();
  }

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      if (hrTimerRef.current) clearInterval(hrTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      audioActiveRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ---------- heart rate mini-chart ---------- */
  function HrChart() {
    const max = Math.max(...bpmHistory, HR_SPIKE_THRESHOLD + 10);
    const min = Math.min(...bpmHistory, 55);
    const range = max - min || 1;
    const w = 100;
    const h = 40;

    const points = bpmHistory
      .map((v, i) => {
        const x = (i / Math.max(bpmHistory.length - 1, 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
      })
      .join(" ");

    const thresholdY = h - ((HR_SPIKE_THRESHOLD - min) / range) * h;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
        <line
          x1="0" y1={thresholdY} x2={w} y2={thresholdY}
          stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4"
        />
        {bpmHistory.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke={bpm >= HR_SPIKE_THRESHOLD ? "#ef4444" : "#34d399"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
      </svg>
    );
  }

  const formatCountdown = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ---------- render ---------- */
  return (
    <div className="space-y-8">
      {/* ========== HEART RATE MONITOR ========== */}
      <section className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50">
        <div className="border-b border-zinc-800/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${hrActive ? "bg-rose-500" : "bg-zinc-700"}`}
                style={hrActive ? { animation: "subtlePulse 1.5s infinite" } : undefined}
              />
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Heart Rate Monitor
              </h2>
            </div>
            {hrActive && (
              <span className="text-[10px] font-medium text-zinc-600">
                Incidents triggered: {hrIncidents}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Simulated BPM readings. Sustained {HR_SPIKE_THRESHOLD}+ BPM for {HR_SPIKE_HOLD_SEC}s auto-creates an incident.
          </p>
        </div>

        <div className="px-6 py-4">
          {hrActive ? (
            <div className="space-y-4">
              <div className="flex items-end gap-6">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Current BPM</span>
                  <p className={`text-4xl font-bold tabular-nums ${bpm >= HR_SPIKE_THRESHOLD ? "text-rose-400" : "text-emerald-400"}`}>
                    {bpm}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Baseline</span>
                  <p className="text-lg font-semibold tabular-nums text-zinc-400">{HR_BASELINE}</p>
                </div>
                {elevatedSec > 0 && (
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Elevated</span>
                    <p className="text-lg font-semibold tabular-nums text-rose-400">{elevatedSec}s / {HR_SPIKE_HOLD_SEC}s</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-zinc-800/40 bg-zinc-950 p-2">
                <HrChart />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSpike}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition-all active:scale-[0.97] ${
                    spiking
                      ? "bg-rose-500 text-white hover:bg-rose-400"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {spiking ? "Spiking — Click to Calm" : "Simulate Spike"}
                </button>
                <button
                  onClick={stopHeartRate}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-700"
                >
                  Stop Monitor
                </button>
                {hrBusy && (
                  <span className="text-[10px] text-amber-400" style={{ animation: "subtlePulse 1s infinite" }}>
                    Creating incident...
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={startHeartRate}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-medium text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.97]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              Start Heart Rate Monitor
            </button>
          )}
        </div>
      </section>

      {/* ========== AUDIO DASHCAM ========== */}
      <section className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50">
        <div className="border-b border-zinc-800/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${audioActive ? "bg-rose-500" : "bg-zinc-700"}`}
                style={audioActive ? { animation: "subtlePulse 1.5s infinite" } : undefined}
              />
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Audio Dashcam
              </h2>
              {audioActive && (
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
                  REC
                </span>
              )}
            </div>
            {audioActive && (
              <span className="font-mono text-sm font-semibold tabular-nums text-zinc-400">
                {formatCountdown(countdown)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Continuously records {AUDIO_CHUNK_SEC}s audio chunks. Each chunk is transcribed and analyzed — incidents created automatically when distress is detected.
          </p>
        </div>

        <div className="px-6 pt-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={100}
            className="h-20 w-full rounded-lg border border-zinc-800/40"
          />
        </div>

        <div className="px-6 py-4">
          {!audioActive ? (
            <button
              onClick={startAudioDashcam}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-medium text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.97]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Start Audio Dashcam
            </button>
          ) : (
            <button
              onClick={stopAudioDashcam}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700 active:scale-[0.97]"
            >
              Stop Dashcam
            </button>
          )}
        </div>

        {micError && (
          <div className="mx-6 mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
            {micError}
          </div>
        )}

        {/* Cycle log */}
        {cycleLogs.length > 0 && (
          <div className="border-t border-zinc-800/60 px-6 py-4">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Scan History
            </h3>
            <div className="space-y-2">
              {cycleLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-950/60 p-3"
                >
                  {log.status === "recording" && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                      <span className="h-2 w-2 rounded-full bg-rose-400" style={{ animation: "subtlePulse 1s infinite" }} />
                    </span>
                  )}
                  {log.status === "analyzing" && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                      <span className="h-2 w-2 rounded-full bg-amber-400" style={{ animation: "subtlePulse 1s infinite" }} />
                    </span>
                  )}
                  {log.status === "done" && log.result === "incident" && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                      </svg>
                    </span>
                  )}
                  {log.status === "done" && log.result === "skip" && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}

                  <div className="min-w-0 flex-1 text-xs">
                    {log.status === "recording" && (
                      <span className="text-rose-400">Recording chunk #{log.id}...</span>
                    )}
                    {log.status === "analyzing" && (
                      <span className="text-amber-400">Transcribing &amp; analyzing chunk #{log.id}...</span>
                    )}
                    {log.status === "done" && log.result === "incident" && (
                      <>
                        <span className="font-medium text-rose-400">
                          Incident created — {log.severity}
                        </span>
                        {log.incidentId && (
                          <a
                            href={`/events/${log.incidentId}`}
                            className="ml-2 text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
                          >
                            View
                          </a>
                        )}
                        {log.transcript && (
                          <p className="mt-1 truncate text-zinc-500">
                            &ldquo;{log.transcript}&rdquo;
                          </p>
                        )}
                      </>
                    )}
                    {log.status === "done" && log.result === "skip" && (
                      <>
                        <span className="text-zinc-500">
                          Chunk #{log.id} — clear
                          {log.error && ` (${log.error})`}
                        </span>
                        {log.transcript && (
                          <p className="mt-0.5 truncate text-zinc-600">
                            &ldquo;{log.transcript}&rdquo;
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
