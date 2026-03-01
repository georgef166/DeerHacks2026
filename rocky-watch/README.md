# Rocky Watch (Galaxy Watch 5 Pro / Wear OS)

Wear OS app for **Rocky Companion** that collects heart rate, accelerometer (fall detection), and optional location from a Samsung Galaxy Watch 5 Pro (or any Wear OS 3 device) and sends data to your Rocky Companion web backend.

## Features

- **Heart rate**: Continuous monitoring via the watch optical sensor; reports elevated heart rate to the backend when above baseline for a configurable duration.
- **Fall detection**: Accelerometer-based spike detection; creates an incident when a possible fall is detected.
- **Location**: Optional GPS/location attached to incidents (when permission is granted).
- **Foreground service**: Runs in the background with a persistent notification so collection continues when the app is not in the foreground.

## Requirements

- **Device**: Samsung Galaxy Watch 5 Pro (or any Wear OS 3+ device with heart rate and accelerometer).
- **Android Studio**: Ladybug (2024.2.1) or newer with Wear OS SDK.
- **Backend**: Rocky Companion web app deployed and the `device_tokens` table created in Supabase (see below).

## Backend setup

1. **Create the device_tokens table**  
   In your Supabase project, run the SQL in:
   `DeerHacks2026/supabase/migrations/20260301000000_device_tokens.sql`  
   (Supabase Dashboard → SQL Editor → paste and run.)

2. **Get a device token**  
   Log in to the Rocky Companion web app, then:
   - Call `POST /api/device-token` (e.g. from the browser console or a "Connect watch" button):
     ```js
     fetch('/api/device-token', { method: 'POST', credentials: 'include' })
       .then(r => r.json())
       .then(d => console.log('Token:', d.token));
     ```
   - Copy the returned `token` and enter it in the watch app Settings.

## Building and running

1. Open the `rocky-watch` folder in **Android Studio**.
2. Let Gradle sync (use the default Gradle wrapper).
3. Connect your Galaxy Watch 5 Pro via USB debugging (or use an emulator with a Wear OS system image).
4. Run the **app** configuration onto the watch.

## Configuring the watch app

1. On the watch, open **Rocky Watch** and tap **Settings**.
2. **Base URL**: Your Rocky Companion backend URL, e.g. `https://your-app.vercel.app` (no trailing slash).
3. **Device token**: Paste the token you got from `POST /api/device-token`.
4. Tap **Save**, then from the main screen tap **Start** to begin monitoring.

## Permissions

The app requests:

- **Body sensors** – heart rate.
- **Activity recognition** – for future use / compatibility.
- **Location** – optional; used to attach coordinates to incidents.
- **Foreground service** – to keep collecting when the app is in the background.

Grant these when prompted so the watch can send data to the backend.

## Project structure

```
rocky-watch/
├── app/
│   ├── src/main/
│   │   ├── java/com/rockycompanion/watch/
│   │   │   ├── MainActivity.kt       # Start/stop monitoring, open Settings
│   │   │   ├── SettingsActivity.kt    # Base URL and device token
│   │   │   ├── MonitorService.kt      # Foreground service, sensors, API calls
│   │   │   ├── Config.kt              # Stored base URL and token
│   │   │   ├── api/
│   │   │   │   ├── RockyApi.kt        # Retrofit interface (heartrate, incidents)
│   │   │   │   └── ApiClient.kt       # OkHttp + Retrofit with Bearer token
│   │   │   ├── data/
│   │   │   │   └── SensorSnapshot.kt  # Data shape for backend
│   │   │   └── sensors/
│   │   │       ├── HeartRateCollector.kt
│   │   │       ├── AccelerometerCollector.kt
│   │   │       └── LocationCollector.kt
│   │   ├── res/
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

## API compatibility

- **Heart rate**: `POST /api/monitor/heartrate` with `bpm`, `baseline`, `elevated_duration_sec`, and optional `reported_lat` / `reported_lng`.
- **Incidents (e.g. fall)**: `POST /api/incidents` with `event_type: "fall_detection"` and `sensor_data` (heart_rate, accelerometer, audio placeholder).

Both endpoints accept **session cookies** (web) or **Authorization: Bearer &lt;device_token&gt;** (watch).

## App icon

The default icon is a system drawable. To use a custom icon, add your own `ic_launcher` and `ic_launcher_round` mipmap assets and point the manifest to them.
