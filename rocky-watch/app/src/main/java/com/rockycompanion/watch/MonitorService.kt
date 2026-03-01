package com.rockycompanion.watch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.rockycompanion.watch.api.ApiClient
import com.rockycompanion.watch.api.HeartRateBody
import com.rockycompanion.watch.api.IncidentBody
import com.rockycompanion.watch.sensors.AccelerometerCollector
import com.rockycompanion.watch.sensors.HeartRateCollector
import com.rockycompanion.watch.sensors.LocationCollector
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MonitorService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var heartRateCollector: HeartRateCollector? = null
    private var accelerometerCollector: AccelerometerCollector? = null
    private var locationCollector: LocationCollector? = null
    private var sendJob: Job? = null

    private var lastBpm: Int = 0
    private var lastBaseline: Int = 75
    private var lastElevated: Boolean = false
    private var lastElevatedDurationSec: Int = 0
    private var lastFallDetected: Boolean = false
    private var lastMagnitudeG: Double = 0.0
    private var lastFallReportedAt: Long = 0
    private val fallReportCooldownMs = 60_000L

    override fun onCreate() {
        super.onCreate()
        serviceRunning = true
        Config.init(this)
        startCollectors()
        startSendLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        serviceRunning = false
        latestBpm = 0
        latestElevated = false
        latestFallDetected = false
        sendJob?.cancel()
        heartRateCollector?.stop()
        accelerometerCollector?.stop()
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    private fun startCollectors() {
        val sensorManager = getSystemService(SENSOR_SERVICE) as android.hardware.SensorManager

        heartRateCollector = HeartRateCollector(sensorManager) { bpm, elevated, baseline, elevatedDurationSec ->
            lastBpm = bpm
            lastBaseline = baseline
            lastElevated = elevated
            lastElevatedDurationSec = elevatedDurationSec
            latestBpm = bpm
            latestElevated = elevated
        }.also { it.start() }

        accelerometerCollector = AccelerometerCollector(sensorManager) { fallDetected, magnitudeG ->
            lastFallDetected = fallDetected
            lastMagnitudeG = magnitudeG
            latestFallDetected = fallDetected
        }.also { it.start() }

        locationCollector = LocationCollector(this)
    }

    private fun startSendLoop() {
        sendJob = serviceScope.launch {
            while (isActive) {
                delay(SEND_INTERVAL_MS)
                if (!Config.isConfigured()) continue
                sendCurrentState()
            }
        }
    }

    private suspend fun sendCurrentState() = withContext(Dispatchers.IO) {
        val api = ApiClient.create(Config.baseUrl, Config.deviceToken) ?: return@withContext

        val location = getLocationCached()

        // Report elevated heart rate — location is optional
        val thresholdSec = Config.heartRateElevatedThresholdSec
        if (lastElevated && lastElevatedDurationSec >= thresholdSec && lastBpm > 0) {
            val body = HeartRateBody(
                bpm = lastBpm,
                baseline = lastBaseline,
                elevated_duration_sec = lastElevatedDurationSec,
                reported_lat = location?.first,
                reported_lng = location?.second
            )
            try {
                val response = api.reportHeartRate(body)
                if (response.isSuccessful) {
                    Log.d(TAG, "Heart rate incident reported: $lastBpm bpm")
                } else {
                    Log.w(TAG, "Heart rate API error: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Heart rate API failed", e)
            }
        }

        // Report fall detection — location is optional
        if (lastFallDetected && (System.currentTimeMillis() - lastFallReportedAt) >= fallReportCooldownMs) {
            val sensorData = mapOf<String, Any>(
                "heart_rate" to mapOf(
                    "bpm" to lastBpm,
                    "elevated" to lastElevated,
                    "baseline" to lastBaseline
                ),
                "accelerometer" to mapOf(
                    "fall_detected" to true,
                    "magnitude_g" to lastMagnitudeG
                ),
                "audio" to mapOf(
                    "level_db" to 0,
                    "anomaly" to false
                )
            )
            val body = IncidentBody(
                event_type = "fall_detection",
                sensor_data = sensorData,
                reported_lat = location?.first,
                reported_lng = location?.second
            )
            try {
                val response = api.reportIncident(body)
                if (response.isSuccessful) {
                    lastFallReportedAt = System.currentTimeMillis()
                    Log.d(TAG, "Fall incident reported")
                } else {
                    Log.w(TAG, "Incident API error: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Incident API failed", e)
            }
        }
    }

    private var cachedLocation: Pair<Double, Double>? = null
    private var cachedLocationTime: Long = 0
    private val locationCacheMs = 60_000L

    private suspend fun getLocationCached(): Pair<Double, Double>? {
        if (cachedLocation != null && System.currentTimeMillis() - cachedLocationTime < locationCacheMs) {
            return cachedLocation
        }
        locationCollector?.getLastLocation()?.let {
            cachedLocation = it
            cachedLocationTime = System.currentTimeMillis()
            return it
        }
        return cachedLocation
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply { setShowBadge(false) }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java)
        val pending = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.monitoring_active))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pending)
            .setOngoing(true)
            .build()
    }

    companion object {
        @Volatile var serviceRunning: Boolean = false
            private set

        /** Latest heart rate BPM — read by MainActivity for live display. */
        @Volatile var latestBpm: Int = 0
        /** Whether heart rate is currently elevated above baseline. */
        @Volatile var latestElevated: Boolean = false
        /** Whether a fall spike was detected since last reset. */
        @Volatile var latestFallDetected: Boolean = false

        private const val TAG = "MonitorService"
        private const val CHANNEL_ID = "rocky_monitor"
        private const val NOTIFICATION_ID = 1
        private const val SEND_INTERVAL_MS = 5_000L

        fun isRunning(context: android.content.Context): Boolean = serviceRunning
    }
}