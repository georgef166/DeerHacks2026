package com.rockycompanion.watch.sensors

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import kotlin.math.sqrt

/**
 * Collects accelerometer data for fall detection.
 * Detects sudden high-magnitude spikes that may indicate a fall.
 */
class AccelerometerCollector(
    private val sensorManager: SensorManager,
    private val onFallOrUpdate: (fallDetected: Boolean, magnitudeG: Double) -> Unit
) : SensorEventListener {

    private var lastMagnitudeG: Double = 0.0
    private var lastFallDetected: Boolean = false
    private var lastMagnitudeTimeMs: Long = 0
    private val fallThresholdG = 3.5
    private val spikeWindowMs = 500L

    private val accelerometer: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    fun start() {
        accelerometer?.let { sensor ->
            sensorManager.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_GAME
            )
            Log.d(TAG, "Accelerometer registered")
        } ?: Log.w(TAG, "No accelerometer available")
    }

    fun stop() {
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val magnitude = sqrt(x * x + y * y + z * z).toDouble()
        val magnitudeG = magnitude / SensorManager.GRAVITY_EARTH
        lastMagnitudeG = magnitudeG
        lastMagnitudeTimeMs = System.currentTimeMillis()

        val fallDetected = magnitudeG >= fallThresholdG
        if (fallDetected) lastFallDetected = true
        onFallOrUpdate(fallDetected, magnitudeG)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    fun getLastMagnitudeG(): Double = lastMagnitudeG
    fun getLastFallDetected(): Boolean = lastFallDetected

    companion object {
        private const val TAG = "AccelerometerCollector"
    }
}
