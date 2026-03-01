package com.rockycompanion.watch.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * API interface matching the Rocky Companion web backend.
 * Base URL is set in ApiClient (e.g. https://your-app.vercel.app).
 */
interface RockyApi {

    @POST("api/monitor/heartrate")
    suspend fun reportHeartRate(@Body body: HeartRateBody): Response<HeartRateResponse>

    @POST("api/monitor/audio")
    suspend fun reportAudio(@Body body: AudioBody): Response<AudioResponse>

    @POST("api/incidents")
    suspend fun reportIncident(@Body body: IncidentBody): Response<IncidentResponse>
}

data class HeartRateBody(
    val bpm: Int,
    val baseline: Int,
    val elevated_duration_sec: Int? = null,
    val reported_lat: Double? = null,
    val reported_lng: Double? = null,
    val reported_address: String? = null
)

data class HeartRateResponse(
    val incident: Any?,
    val analysis: Any?
)

data class AudioBody(
    val audio_base64: String,
    val audio_content_type: String = "audio/wav",
    val prev_audio_base64: String? = null,
    val reported_lat: Double? = null,
    val reported_lng: Double? = null,
    val reported_address: String? = null
)

data class AudioResponse(
    val action: String?,
    val incident: Any?,
    val transcript: String?,
    val analysis: Any?
)

data class IncidentBody(
    val event_type: String,
    val sensor_data: Map<String, Any>,
    val audio_base64: String? = null,
    val audio_content_type: String? = null,
    val reported_lat: Double? = null,
    val reported_lng: Double? = null,
    val reported_address: String? = null
)

data class IncidentResponse(
    val incident: Any?
)
