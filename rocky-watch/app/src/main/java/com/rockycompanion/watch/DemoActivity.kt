package com.rockycompanion.watch

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import android.util.Base64
import com.rockycompanion.watch.api.ApiClient
import com.rockycompanion.watch.api.AudioBody
import com.rockycompanion.watch.api.HeartRateBody
import com.rockycompanion.watch.api.IncidentBody
import com.rockycompanion.watch.databinding.ActivityDemoBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Demo / simulation screen — lets you fire test alerts directly from the watch
 * without needing real sensor triggers. Each button POSTs to the Rocky Companion
 * backend using the saved device token, and the alert shows up live on the
 * parent dashboard.
 */
class DemoActivity : ComponentActivity() {

    private lateinit var binding: ActivityDemoBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Config.init(this)
        binding = ActivityDemoBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.heartRateButton.setOnClickListener { triggerHeartRate() }
        binding.fallButton.setOnClickListener { triggerFall() }
        binding.audioButton.setOnClickListener { triggerAudio() }

        // Set initial state
        setStatus(getString(R.string.demo_ready), State.IDLE)
    }

    // ─── Triggers ────────────────────────────────────────────────────────────────

    private fun triggerHeartRate() {
        val api = requireApi() ?: return
        setStatus(getString(R.string.demo_sending_hr), State.LOADING)
        lifecycleScope.launch {
            try {
                val body = HeartRateBody(
                    bpm = 162,
                    baseline = 72,
                    elevated_duration_sec = 20
                )
                val response = withContext(Dispatchers.IO) { api.reportHeartRate(body) }
                if (response.isSuccessful) {
                    setStatus(getString(R.string.demo_sent_hr), State.SUCCESS)
                } else {
                    setStatus("Error ${response.code()}", State.ERROR)
                }
            } catch (e: Exception) {
                setStatus(getString(R.string.demo_error_network), State.ERROR)
            }
        }
    }

    private fun triggerFall() {
        val api = requireApi() ?: return
        setStatus(getString(R.string.demo_sending_fall), State.LOADING)
        lifecycleScope.launch {
            try {
                val sensorData = mapOf<String, Any>(
                    "heart_rate" to mapOf("bpm" to 105, "elevated" to false, "baseline" to 72),
                    "accelerometer" to mapOf("fall_detected" to true, "magnitude_g" to 4.8),
                    "audio" to mapOf("level_db" to 0, "anomaly" to false)
                )
                val body = IncidentBody(
                    event_type = "fall_detection",
                    sensor_data = sensorData
                )
                val response = withContext(Dispatchers.IO) { api.reportIncident(body) }
                if (response.isSuccessful) {
                    setStatus(getString(R.string.demo_sent_fall), State.SUCCESS)
                } else {
                    setStatus("Error ${response.code()}", State.ERROR)
                }
            } catch (e: Exception) {
                setStatus(getString(R.string.demo_error_network), State.ERROR)
            }
        }
    }

    private fun triggerAudio() {
        val api = requireApi() ?: return
        setStatus(getString(R.string.demo_sending_audio), State.LOADING)
        lifecycleScope.launch {
            try {
                val body = AudioBody(
                    audio_base64 = DEMO_WAV_BASE64,
                    audio_content_type = "audio/wav"
                )
                val response = withContext(Dispatchers.IO) { api.reportAudio(body) }
                if (response.isSuccessful) {
                    val action = response.body()?.action
                    when (action) {
                        "incident_created" -> setStatus(getString(R.string.demo_sent_audio), State.SUCCESS)
                        "skip" -> setStatus("Audio benign — no incident", State.SUCCESS)
                        else -> setStatus(getString(R.string.demo_sent_audio), State.SUCCESS)
                    }
                } else {
                    setStatus("Error ${response.code()}", State.ERROR)
                }
            } catch (e: Exception) {
                setStatus(getString(R.string.demo_error_network), State.ERROR)
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    companion object {
        /**
         * Minimal valid WAV file (44-byte header + 8000 samples of silence at 8kHz mono 16-bit).
         * Enough for the ElevenLabs STT pipeline to process without crashing.
         * Pre-encoded as base64 to avoid generating it at runtime.
         *
         * Header breakdown: RIFF chunk + fmt sub-chunk (PCM, 1ch, 8000Hz, 16-bit) + data sub-chunk.
         */
        private val DEMO_WAV_BASE64: String by lazy {
            // Build a proper WAV in memory: 44-byte header + 16000 bytes of silence (1s @ 8kHz 16-bit mono)
            val sampleRate = 8000
            val numSamples = sampleRate // 1 second
            val dataSize = numSamples * 2 // 16-bit = 2 bytes per sample
            val buf = java.nio.ByteBuffer.allocate(44 + dataSize).order(java.nio.ByteOrder.LITTLE_ENDIAN)
            // RIFF header
            buf.put("RIFF".toByteArray())
            buf.putInt(36 + dataSize)
            buf.put("WAVE".toByteArray())
            // fmt chunk
            buf.put("fmt ".toByteArray())
            buf.putInt(16)        // chunk size
            buf.putShort(1)       // PCM
            buf.putShort(1)       // mono
            buf.putInt(sampleRate)
            buf.putInt(sampleRate * 2) // byte rate
            buf.putShort(2)       // block align
            buf.putShort(16)      // bits per sample
            // data chunk
            buf.put("data".toByteArray())
            buf.putInt(dataSize)
            // silence (all zeros already from allocate)
            Base64.encodeToString(buf.array(), Base64.NO_WRAP)
        }
    }

    private fun requireApi() = ApiClient.create(Config.baseUrl, Config.deviceToken).also {
        if (it == null) setStatus(getString(R.string.demo_error_token), State.ERROR)
    }

    private enum class State { IDLE, LOADING, SUCCESS, ERROR }

    private fun setStatus(text: String, state: State) {
        binding.statusText.text = text
        binding.statusIcon.setImageResource(
            when (state) {
                State.IDLE -> R.drawable.ic_rocky_normal
                State.SUCCESS -> R.drawable.ic_rocky_happy
                State.ERROR -> R.drawable.ic_rocky_concerned
                State.LOADING -> R.drawable.ic_rocky_concerned
            }
        )
        binding.statusText.setTextColor(
            when (state) {
                State.IDLE -> getColor(R.color.rocky_slate_400)
                State.SUCCESS -> getColor(R.color.rocky_emerald_dark)
                State.ERROR   -> getColor(R.color.rocky_rose_dark)
                State.LOADING -> getColor(R.color.rocky_slate_400)
            }
        )
    }
}
