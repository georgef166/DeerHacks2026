# 🐾 Rocky Companion

**A real-time child safety monitoring system powered by multi-layer AI.**

Rocky is a wearable IoT companion concept for children that monitors **heart rate**, **motion**, and **ambient audio** in real time. When something concerning is detected — bullying, verbal aggression, a fall, or a panic spike — Rocky runs a multi-stage AI pipeline and delivers an instant, actionable alert to the parent's dashboard with severity level, what happened, and what to do next.

> Built at **DeerHacks 2026** · Prize tracks: ElevenLabs · Vultr · Gemini API

---

## 🧠 How It Works

Rocky uses a **three-layer AI pipeline** to detect, analyze, and explain safety incidents:

```
Child's Device → Audio/Sensors → ElevenLabs STT → Keyword Filter → Vultr LLM → Supabase → Parent Dashboard
```

### Layer 1: ElevenLabs (Hearing)
Audio is recorded in **30-second encrypted chunks** and transcribed by **ElevenLabs Scribe V2** — the ears of the system.

### Layer 2: Keyword Filter + Vultr (Understanding)
Transcripts pass through a **sub-millisecond keyword filter** scanning 180+ distress phrases. Clean audio is discarded instantly (no API call, no cost). Flagged transcripts are sent to a **self-hosted Mixtral 8x22B model** (176B parameters) running on a **Vultr cloud server** via Ollama. The model analyzes the transcript combined with heart rate, motion, time of day, and location to produce a structured severity assessment.

### Layer 3: Gemini (Explaining)
For deep analysis, **Google Gemini** generates a comprehensive parent-facing report with severity, categories, a human-readable summary, and specific action steps like _"Call the school office"_ or _"Check in with your child about what happened at 3:15 PM."_

---

## 🔐 Privacy Architecture

- **Audio is never stored** unless an incident is flagged — rolling 30-second buffer is overwritten each cycle
- **Self-hosted LLM** — child transcripts never touch a public API (OpenAI, Google, etc.)
- **Supabase Row-Level Security** — parents can only see their own children's incidents
- **Server-side processing** — audio is processed entirely on the server, never sent to the client dashboard

---

## 🖥️ Simulation Studio

Since the physical wearable doesn't exist yet, the **Simulation Studio** lets you experience the full pipeline using your laptop's sensors:

| Sensor | Simulation Method |
|---|---|
| **Heart Rate** | Generates realistic BPM around baseline of 82. "Panic Spike" button forces BPM > 120. |
| **Audio Dashcam** | Uses your **real microphone** to record 30-second chunks through the full AI pipeline. |
| **Fall Detection** | "Simulate Fall" button sends a synthetic 2.8g accelerometer spike. |
| **GPS Location** | Captures real browser geolocation and includes it in incident reports. |

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript | Dashboard, Simulation Studio |
| **Styling** | Tailwind CSS v4 | Responsive, premium UI |
| **Auth** | Supabase Auth | Email/password + Google OAuth |
| **Database** | Supabase (Postgres) | Incident storage, Realtime CDC |
| **File Storage** | Supabase Storage | Audio clip storage |
| **Speech-to-Text** | ElevenLabs Scribe V2 | Audio transcription |
| **LLM (Private)** | Mixtral 8x22B via Ollama on Vultr | Context-aware safety analysis |
| **LLM (Analysis)** | Google Gemini | Parent-facing situation reports |
| **Notifications** | Web Notifications API + Supabase Realtime | Native OS-level push alerts |
| **Maps** | OpenStreetMap | Incident location display |

---

## ‼️ Notification System

Three layers fire simultaneously when an incident is created:

1. **In-App Notification Dropdown** — Bell icon pulses red, auto-opens with severity-appropriate coloring. Works across all pages via Supabase Realtime CDC.
2. **Cross-Tab Sync** — An alert triggered in the Simulation Studio tab instantly appears in the Dashboard tab. No polling — pure database-level event propagation.
3. **Native Browser Push** — Uses the Web Notifications API. Fires even when the browser is minimized. `requireInteraction: true` for high/critical alerts.

---

## 🚀 Local Setup (or just use the deployed version!!)

### Prerequisites

- Node.js 18+
- npm
- Supabase project (with `incidents` table and `audio-clips` storage bucket)
- ElevenLabs API key
- Google Gemini API key
- Vultr server running Ollama with Mixtral 8x22B

### Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/your-repo/safeday-web.git
   cd safeday-web
   npm install
   ```

2. **Create `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GEMINI_API_KEY=your-gemini-key
   ELEVENLABS_API_KEY=your-elevenlabs-key
   VULTR_OLLAMA_URL=http://your-vultr-ip:11434
   ```

3. **Run:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Database Schema (Supabase)

### `incidents` table

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Parent's auth user ID |
| `event_type` | `text` | `audio_anomaly`, `heart_rate`, `fall`, `combined` |
| `sensor_data` | `jsonb` | Full sensor snapshot (HR, accel, audio, GPS) |
| `audio_url` | `text` | Path to audio clip in Supabase Storage |
| `transcript` | `text` | Full text transcript from ElevenLabs |
| `severity` | `text` | `low`, `medium`, `high`, `critical` |
| `summary` | `text` | AI-generated human-readable summary |
| `categories` | `text[]` | `bullying`, `distress`, `conflict`, `physical_safety`, etc. |
| `suggested_actions` | `text[]` | Recommended parent actions |
| `status` | `text` | `pending` or `analyzed` |
| `is_simulation` | `boolean` | Whether from the Simulation Studio |

### `audio-clips` storage bucket

Audio files stored at `{user_id}/{incident_id}.webm`

---

## 🌐 Deployment

Deployed on **Vercel**. Environment variables must be set in the Vercel dashboard.

For Google OAuth to work in production, update:
1. **Supabase Dashboard** → Authentication → URL Configuration → set Site URL and Redirect URLs to your Vercel domain
2. **Google Cloud Console** → OAuth consent screen → add Vercel domain to authorized origins

---

## 🚀 Team

George Farag, Maryam Elhamidi, Taimoor Aleem, & Annason Tao

Built at DeerHacks 2026.

---