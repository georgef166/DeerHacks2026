package com.rockycompanion.watch.sensors

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import kotlin.math.abs

/**
 * Collects heart rate from the watch's optical sensor (TYPE_HEART_RATE).
 * Tracks baseline and elevated state for the Rocky Companion backend.
 */
class HeartRateCollector(
    private val sensorManager: SensorManager,
    private val onHeartRate: (bpm: Int, elevated: Boolean, baseline: Int, elevatedDurationSec: Int) -> Unit
) : SensorEventListener {

    private var baselineBpm: Int = 75
    private var lastBpm: Int = 0
    private var elevatedStartMs: Long? = null
    private val elevatedThreshold = 15 // BPM above baseline to consider "elevated"

    private val heartRateSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_HEART_RATE)

    fun start() {
        heartRateSensor?.let { sensor ->
            sensorManager.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_NORMAL
            )
            Log.d(TAG, "Heart rate sensor registered")
        } ?: Log.w(TAG, "No heart rate sensor available")
    }

    fun stop() {
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_HEART_RATE) return
        val bpm = event.values[0].toInt()
        if (bpm <= 0 || bpm > 250) return

        lastBpm = bpm
        // Adapt baseline slowly (resting heart rate)
        if (baselineBpm == 0) baselineBpm = bpm
        else baselineBpm = (baselineBpm * 19 + bpm) / 20

        val elevated = bpm >= baselineBpm + elevatedThreshold
        val now = System.currentTimeMillis()
        if (elevated) {
            if (elevatedStartMs == null) elevatedStartMs = now
        } else {
            elevatedStartMs = null
        }
        val elevatedDurationSec = elevatedStartMs?.let { ((now - it) / 1000).toInt() } ?: 0

        onHeartRate(bpm, elevated, baselineBpm, elevatedDurationSec)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    fun getLastBpm(): Int = lastBpm
    fun getBaselineBpm(): Int = baselineBpm

    companion object {
        private const val TAG = "HeartRateCollector"
    }
}
