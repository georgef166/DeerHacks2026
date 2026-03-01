package com.rockycompanion.watch.data

/**
 * Snapshot of sensor data to send to the Rocky Companion backend.
 * Matches the web API expectations: heart_rate, accelerometer, optional location.
 */
data class SensorSnapshot(
    val heartRateBpm: Int?,
    val heartRateBaseline: Int,
    val heartRateElevated: Boolean,
    val elevatedDurationSec: Int = 0,
    val fallDetected: Boolean,
    val accelerometerMagnitudeG: Double?,
    val locationLat: Double?,
    val locationLng: Double?,
    val locationAddress: String?,
    val timestamp: Long = System.currentTimeMillis()
)
