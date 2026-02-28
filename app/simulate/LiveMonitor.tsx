"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ── config ─────────────────────────────────────────────── */
const HR_BASELINE = 82;
const HR_SPIKE_THRESHOLD = 120;
const HR_SPIKE_HOLD_SEC = 10;
const HR_TICK_MS = 1000;
const AUDIO_CHUNK_SEC = 30;

function nextBpm(prev: number, spiking: boolean): number {
  if (spiking) {
    const drift = (Math.random() - 0.3) * 6;
    return Math.round(Math.min(180, Math.max(HR_SPIKE_THRESHOLD, prev + drift)));
  }
  const drift = (Math.random() - 0.5) * 4;
  return Math.round(Math.min(110, Math.max(60, prev + drift)));
}

/* ── types ──────────────────────────────────────────────── */
interface AudioCycleLog {
  id: number;
  status: "recording" | "analyzing" | "done";
  result?: "skip" | "incident";
  transcript?: string;
  severity?: string;
  incidentId?: string;
  error?: string;
}

interface EventLog {
  id: number;
  time: string;
  type: "hr_incident" | "fall_trigger" | "audio_scan";
  label: string;
  severity?: string;
  incidentId?: string;
  error?: string;
}

/* ── component ──────────────────────────────────────────── */
export function LiveMonitor() {
  const router = useRouter();

  /* ---- master state ---- */
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  /* ---- heart rate ---- */
  const [bpm, setBpm] = useState(HR_BASELINE);
  const [bpmHistory, setBpmHistory] = useState<number[]>([]);
  const [spiking, setSpiking] = useState(false);
  const [elevatedSec, setElevatedSec] = useState(0);
  const [hrBusy, setHrBusy] = useState(false);
  const hrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elevatedRef = useRef(0);
  const spikingRef = useRef(false);

  /* ---- audio dashcam ---- */
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
  const prevChunkB64Ref = useRef<string | null>(null);

  /* ---- event log ---- */
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const eventIdRef = useRef(0);

  /* ---- fall trigger ---- */
  const [fallBusy, setFallBusy] = useState(false);

  /* ---- pipeline state (for scenario triggers) ---- */
  const [pipelineSteps, setPipelineSteps] = useState<
    { text: string; status: "done" | "active" | "pending" }[]
  >([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<{
    incidentId: string;
    label: string;
  } | null>(null);

  function pushEvent(ev: Omit<EventLog, "id" | "time">) {
    const id = ++eventIdRef.current;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setEventLog((prev) => [{ ...ev, id, time }, ...prev.slice(0, 19)]);
  }

  /* ================================================================ */
  /*  Waveform drawing                                                 */
  /* ================================================================ */
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

  /* ================================================================ */
  /*  Heart rate engine                                                */
  /* ================================================================ */
  const triggerHrIncident = useCallback(
    async (currentBpm: number, durationSec: number) => {
      if (hrBusy) return;
      setHrBusy(true);
      try {
        const res = await fetch("/api/monitor/heartrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bpm: currentBpm, baseline: HR_BASELINE, elevated_duration_sec: durationSec }),
        });
        if (res.ok) {
          const data = await res.json();
          pushEvent({
            type: "hr_incident",
            label: `Heart rate incident — ${currentBpm} bpm for ${durationSec}s`,
            severity: data.analysis?.severity ?? data.incident?.severity,
            incidentId: data.incident?.id,
          });
          router.refresh();
        }
      } catch {
        /* retry on next threshold crossing */
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
    setSpiking(false);
    spikingRef.current = false;
  }

  function toggleSpike() {
    const next = !spiking;
    setSpiking(next);
    spikingRef.current = next;
    if (next) setBpm(HR_SPIKE_THRESHOLD + Math.round(Math.random() * 20));
  }

  /* ================================================================ */
  /*  Audio dashcam engine                                             */
  /* ================================================================ */
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
        prev.map((l) => (l.id === cycleId ? { ...l, status: "analyzing" } : l))
      );

      try {
        const b64 = await blobToBase64(blob);
        const payload: Record<string, string> = {
          audio_base64: b64,
          audio_content_type: "audio/webm",
        };
        if (prevChunkB64Ref.current) {
          payload.prev_audio_base64 = prevChunkB64Ref.current;
        }

        const res = await fetch("/api/monitor/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        const isIncident = data.action === "incident_created";

        setCycleLogs((prev) =>
          prev.map((l) =>
            l.id === cycleId
              ? {
                  ...l,
                  status: "done",
                  result: isIncident ? "incident" : "skip",
                  transcript: data.transcript || "",
                  severity: data.analysis?.severity || data.severity,
                  incidentId: data.incident?.id,
                  error: data.error || data.reason,
                }
              : l
          )
        );

        if (isIncident) {
          prevChunkB64Ref.current = null;
          pushEvent({
            type: "audio_scan",
            label: `Audio distress detected`,
            severity: data.analysis?.severity,
            incidentId: data.incident?.id,
          });
          router.refresh();
        } else {
          prevChunkB64Ref.current = b64;
        }
      } catch (err) {
        prevChunkB64Ref.current = null;
        setCycleLogs((prev) =>
          prev.map((l) =>
            l.id === cycleId
              ? { ...l, status: "done", result: "skip", error: err instanceof Error ? err.message : "Failed" }
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
    prevChunkB64Ref.current = null;
    audioActiveRef.current = true;
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
      setCycleLogs((prev) => [{ id: cycleId, status: "recording" }, ...prev.slice(0, 9)]);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        processAudioChunk(blob, cycleId);
        if (audioActiveRef.current) beginAudioCycle();
      };

      recorder.start();
      setCountdown(AUDIO_CHUNK_SEC);

      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => (c <= 1 ? AUDIO_CHUNK_SEC : c - 1));
      }, 1000);

      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, AUDIO_CHUNK_SEC * 1000);
    } catch {
      setMicError("Microphone access denied.");
      audioActiveRef.current = false;
    }
  }

  function stopAudioDashcam() {
    audioActiveRef.current = false;
    prevChunkB64Ref.current = null;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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

  /* ================================================================ */
  /*  Master ON/OFF                                                    */
  /* ================================================================ */
  function startMonitoring() {
    setActive(true);
    activeRef.current = true;
    setEventLog([]);
    setPipelineSteps([]);
    setPipelineError(null);
    setPipelineResult(null);
    startHeartRate();
    startAudioDashcam();
  }

  function stopMonitoring() {
    setActive(false);
    activeRef.current = false;
    stopHeartRate();
    stopAudioDashcam();
  }

  /* ================================================================ */
  /*  Fall detection trigger                                           */
  /* ================================================================ */
  async function triggerFall() {
    if (fallBusy) return;
    setFallBusy(true);
    setPipelineSteps([
      { text: "Creating fall incident...", status: "active" },
      { text: "Running AI analysis...", status: "pending" },
      { text: "Done", status: "pending" },
    ]);
    setPipelineError(null);
    setPipelineResult(null);

    try {
      const sensorData = {
        heart_rate: { bpm, elevated: bpm >= HR_SPIKE_THRESHOLD, baseline: HR_BASELINE },
        accelerometer: { fall_detected: true, magnitude_g: 2.8, axis: "z" },
        audio: { level_db: 72, anomaly: false },
      };

      const createRes = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "fall", sensor_data: sensorData }),
      });

      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${createRes.status}`);
      }

      const { incident } = await createRes.json();
      setPipelineSteps((s) => {
        const n = [...s];
        n[0] = { text: "Fall incident created", status: "done" };
        n[1] = { text: "Running AI analysis...", status: "active" };
        return n;
      });

      const analyzeRes = await fetch(`/api/incidents/${incident.id}/analyze`, { method: "POST" });
      const analyzeData = await analyzeRes.json().catch(() => ({}));

      if (analyzeRes.ok) {
        setPipelineSteps((s) => {
          const n = [...s];
          n[1] = { text: "AI analysis complete", status: "done" };
          n[2] = { text: "Incident ready for review", status: "done" };
          return n;
        });
      } else {
        setPipelineSteps((s) => {
          const n = [...s];
          n[1] = { text: "AI analysis failed", status: "done" };
          n[2] = { text: "Done", status: "done" };
          return n;
        });
        setPipelineError(analyzeData.error || `HTTP ${analyzeRes.status}`);
      }

      setPipelineResult({ incidentId: incident.id, label: "Fall Detected" });
      pushEvent({
        type: "fall_trigger",
        label: "Fall detected — 2.8g impact",
        severity: analyzeData.analysis?.severity ?? analyzeData.incident?.severity,
        incidentId: incident.id,
      });
      router.refresh();
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : "Failed");
    } finally {
      setFallBusy(false);
    }
  }

  /* ================================================================ */
  /*  Cleanup                                                          */
  /* ================================================================ */
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

  /* ================================================================ */
  /*  HR chart                                                         */
  /* ================================================================ */
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
        <line x1="0" y1={thresholdY} x2={w} y2={thresholdY} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
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

  const fmtCountdown = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* ── Master Toggle ────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-6 py-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Live Monitoring</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {active
              ? "Heart rate and audio are being monitored in real-time"
              : "Start monitoring to enable heart rate tracking and audio dashcam"}
          </p>
        </div>
        <button
          onClick={active ? stopMonitoring : startMonitoring}
          className={`relative rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all active:scale-[0.97] ${
            active
              ? "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/25"
              : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          }`}
        >
          {active && (
            <span
              className="absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-rose-400"
              style={{ animation: "subtlePulse 1.5s infinite" }}
            />
          )}
          <span className={active ? "ml-3" : ""}>{active ? "Stop" : "Start"}</span>
        </button>
      </div>

      {/* ── Sensor Dashboard (only visible when active) ─ */}
      {active && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Heart Rate Card */}
          <section className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50">
            <div className="border-b border-zinc-800/60 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" style={{ animation: "subtlePulse 1.5s infinite" }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Heart Rate</span>
                </div>
                <span className={`text-2xl font-bold tabular-nums ${bpm >= HR_SPIKE_THRESHOLD ? "text-rose-400" : "text-emerald-400"}`}>
                  {bpm} <span className="text-xs font-normal text-zinc-600">bpm</span>
                </span>
              </div>
            </div>

            <div className="px-5 py-3">
              <div className="rounded-lg border border-zinc-800/40 bg-zinc-950 p-2">
                <HrChart />
              </div>

              <div className="mt-3 flex items-center gap-3">
                {elevatedSec > 0 && (
                  <span className="rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-rose-400">
                    Elevated {elevatedSec}s / {HR_SPIKE_HOLD_SEC}s
                  </span>
                )}
                {hrBusy && (
                  <span className="text-[10px] text-amber-400" style={{ animation: "subtlePulse 1s infinite" }}>
                    Creating incident...
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Audio Dashcam Card */}
          <section className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50">
            <div className="border-b border-zinc-800/60 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" style={{ animation: "subtlePulse 1.5s infinite" }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Audio Dashcam</span>
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">REC</span>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-zinc-400">
                  {fmtCountdown(countdown)}
                </span>
              </div>
            </div>

            <div className="px-5 py-3">
              <canvas
                ref={canvasRef}
                width={800}
                height={100}
                className="h-16 w-full rounded-lg border border-zinc-800/40"
              />
              <p className="mt-2 text-[10px] text-zinc-600">
                {AUDIO_CHUNK_SEC}s rolling chunks — transcribed and analyzed automatically
              </p>
            </div>

            {micError && (
              <div className="mx-5 mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
                {micError}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Trigger Buttons ─────────────────────────── */}
      {active && (
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-6 py-5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Simulate Events
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleSpike}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium transition-all active:scale-[0.97] ${
                spiking
                  ? "bg-rose-500 text-white hover:bg-rose-400"
                  : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              {spiking ? "Stop Panic Spike" : "Trigger Panic Spike"}
            </button>

            <button
              onClick={triggerFall}
              disabled={fallBusy}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700 active:scale-[0.97] disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {fallBusy ? "Processing..." : "Trigger Fall Detection"}
            </button>
          </div>

          <p className="mt-2 text-[10px] text-zinc-600">
            Panic spike simulates sustained elevated heart rate. Fall detection creates an immediate incident with AI analysis.
            Audio monitoring runs automatically via the dashcam.
          </p>
        </section>
      )}

      {/* ── Pipeline Progress (fall trigger) ─────────── */}
      {pipelineSteps.length > 0 && (
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Pipeline
          </h3>
          {pipelineError && (
            <div className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
              {pipelineError}
            </div>
          )}
          <div className="space-y-2">
            {pipelineSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.status === "done" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {step.status === "active" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ animation: "subtlePulse 1.5s infinite" }} />
                  </span>
                )}
                {step.status === "pending" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  </span>
                )}
                <span className={`text-xs ${step.status === "done" ? "text-zinc-400" : step.status === "active" ? "font-medium text-emerald-400" : "text-zinc-600"}`}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
          {pipelineResult && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div className="text-xs">
                <span className="font-medium text-emerald-400">{pipelineResult.label}</span>{" "}
                <span className="text-zinc-500">incident analyzed</span>
                <div className="mt-1 flex gap-3">
                  <a href={`/events/${pipelineResult.incidentId}`} className="font-medium text-zinc-300 underline underline-offset-2 hover:text-zinc-100">
                    View Detail
                  </a>
                  <a href="/dashboard" className="font-medium text-zinc-300 underline underline-offset-2 hover:text-zinc-100">
                    Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Audio Scan History ───────────────────────── */}
      {cycleLogs.length > 0 && (
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Audio Scan History
          </h3>
          <div className="space-y-2">
            {cycleLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-950/60 p-3">
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
                  {log.status === "recording" && <span className="text-rose-400">Recording chunk #{log.id}...</span>}
                  {log.status === "analyzing" && <span className="text-amber-400">Transcribing &amp; analyzing #{log.id}...</span>}
                  {log.status === "done" && log.result === "incident" && (
                    <>
                      <span className="font-medium text-rose-400">Alert — {log.severity}</span>
                      {log.incidentId && (
                        <a href={`/events/${log.incidentId}`} className="ml-2 text-zinc-400 underline underline-offset-2 hover:text-zinc-200">
                          View
                        </a>
                      )}
                      {log.transcript && <p className="mt-1 truncate text-zinc-500">&ldquo;{log.transcript}&rdquo;</p>}
                    </>
                  )}
                  {log.status === "done" && log.result === "skip" && (
                    <>
                      <span className="text-zinc-500">Chunk #{log.id} — clear{log.error && ` (${log.error})`}</span>
                      {log.transcript && <p className="mt-0.5 truncate text-zinc-600">&ldquo;{log.transcript}&rdquo;</p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Event Feed ──────────────────────────────── */}
      {eventLog.length > 0 && (
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Incident Feed
          </h3>
          <div className="space-y-2">
            {eventLog.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-zinc-800/40 bg-zinc-950/60 px-4 py-2.5">
                {ev.type === "hr_incident" && (
                  <svg className="h-3.5 w-3.5 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                )}
                {ev.type === "fall_trigger" && (
                  <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                {ev.type === "audio_scan" && (
                  <svg className="h-3.5 w-3.5 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <span className="text-zinc-300">{ev.label}</span>
                  {ev.severity && (
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      ev.severity === "critical" || ev.severity === "high"
                        ? "bg-rose-500/15 text-rose-400"
                        : ev.severity === "medium"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {ev.severity}
                    </span>
                  )}
                  {ev.incidentId && (
                    <a href={`/events/${ev.incidentId}`} className="ml-2 text-zinc-500 underline underline-offset-2 hover:text-zinc-300">
                      View
                    </a>
                  )}
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">{ev.time}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Idle State ──────────────────────────────── */}
      {!active && eventLog.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/60 py-16 text-center">
          <svg className="mb-4 h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-sm text-zinc-500">Press <span className="font-semibold text-emerald-400">Start</span> to begin monitoring</p>
          <p className="mt-1 text-xs text-zinc-600">
            Heart rate tracking, audio dashcam, and incident detection will activate simultaneously
          </p>
        </div>
      )}
    </div>
  );
}
