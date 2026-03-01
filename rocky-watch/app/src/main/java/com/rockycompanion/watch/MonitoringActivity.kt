package com.rockycompanion.watch

import android.media.MediaRecorder
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.rockycompanion.watch.api.ApiClient
import com.rockycompanion.watch.api.AudioBody
import com.rockycompanion.watch.api.HeartRateBody
import com.rockycompanion.watch.api.IncidentBody
import com.rockycompanion.watch.databinding.ActivityMonitoringBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Active monitoring screen.
 * - Starts audio recording immediately on launch.
 * - Heart Rate button → POST /api/monitor/heartrate
 * - Fall button       → POST /api/incidents (fall_detection)
 * - Stop button       → stops recording, encodes audio, POST /api/monitor/audio, finishes.
 */
class MonitoringActivity : ComponentActivity() {

    private lateinit var binding: ActivityMonitoringBinding

    @Suppress("DEPRECATION")
    private var recorder: MediaRecorder? = null
    private var audioFile: File? = null
    private var isRecording = false
    private var isSending = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Config.init(this)
        binding = ActivityMonitoringBinding.inflate(layoutInflater)
        setContentView(binding.root)

        startRecording()

        binding.heartRateButton.setOnClickListener { onHeartRateTapped() }
        binding.fallButton.setOnClickListener { onFallTapped() }
        binding.stopButton.setOnClickListener { onStopTapped() }
    }

    override fun onDestroy() {
        stopRecording()
        super.onDestroy()
    }

    // ─── Recording ───────────────────────────────────────────────────────────────

    @Suppress("DEPRECATION")
    private fun startRecording() {
        try {
            audioFile = File(cacheDir, "rec_${System.currentTimeMillis()}.mp4")
            recorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioChannels(1)
                setOutputFile(audioFile!!.absolutePath)
                prepare()
                start()
            }
            isRecording = true
            setStatus(getString(R.string.rec_recording), State.RECORDING)
        } catch (e: Exception) {
            setStatus("Mic error: ${e.message}", State.ERROR)
        }
    }

    private fun stopRecording() {
        if (isRecording) {
            try {
                recorder?.stop()
            } catch (_: Exception) {}
            recorder?.release()
            recorder = null
            isRecording = false
        }
    }

    // ─── Trigger: Heart Rate ─────────────────────────────────────────────────────

    private fun onHeartRateTapped() {
        if (isSending) return
        val api = ApiClient.create(Config.baseUrl, Config.deviceToken) ?: run {
            setStatus(getString(R.string.demo_error_token), State.ERROR)
            return
        }
        isSending = true
        setStatus(getString(R.string.rec_sending_hr), State.LOADING)
        binding.rockyImage.setImageResource(R.drawable.ic_rocky_concerned)
        lifecycleScope.launch {
            try {
                val body = HeartRateBody(
                    bpm = 162,
                    baseline = 72,
                    elevated_duration_sec = 20
                )
                val resp = withContext(Dispatchers.IO) { api.reportHeartRate(body) }
                if (resp.isSuccessful) {
                    setStatus(getString(R.string.rec_hr_sent), State.SUCCESS)
                } else {
                    setStatus("Error ${resp.code()}", State.ERROR)
                }
            } catch (e: Exception) {
                setStatus(getString(R.string.demo_error_network), State.ERROR)
            } finally {
                isSending = false
                delay(2_000)
                binding.rockyImage.setImageResource(R.drawable.ic_rocky_happy)
                setStatus(getString(R.string.rec_recording), State.RECORDING)
            }
        }
    }

    // ─── Trigger: Fall ───────────────────────────────────────────────────────────

    private fun onFallTapped() {
        if (isSending) return
        val api = ApiClient.create(Config.baseUrl, Config.deviceToken) ?: run {
            setStatus(getString(R.string.demo_error_token), State.ERROR)
            return
        }
        isSending = true
        setStatus(getString(R.string.rec_sending_fall), State.LOADING)
        binding.rockyImage.setImageResource(R.drawable.ic_rocky_concerned)
        lifecycleScope.launch {
            try {
                val sensorData = mapOf<String, Any>(
                    "heart_rate" to mapOf("bpm" to 110, "elevated" to true, "baseline" to 82),
                    "accelerometer" to mapOf("fall_detected" to true, "g_force" to 2.8),
                    "audio" to mapOf("level_db" to 70, "anomaly" to false)
                )
                val body = IncidentBody(
                    event_type = "fall",
                    sensor_data = sensorData
                )
                val resp = withContext(Dispatchers.IO) { api.reportIncident(body) }
                if (resp.isSuccessful) {
                    setStatus(getString(R.string.rec_fall_sent), State.SUCCESS)
                } else {
                    setStatus("Error ${resp.code()}", State.ERROR)
                }
            } catch (e: Exception) {
                setStatus(getString(R.string.demo_error_network), State.ERROR)
            } finally {
                isSending = false
                delay(2_000)
                binding.rockyImage.setImageResource(R.drawable.ic_rocky_happy)
                setStatus(getString(R.string.rec_recording), State.RECORDING)
            }
        }
    }

    // ─── Stop & Send audio ───────────────────────────────────────────────────────

    private fun onStopTapped() {
        if (isSending) return
        binding.stopButton.isEnabled = false
        binding.heartRateButton.isEnabled = false
        binding.fallButton.isEnabled = false

        stopRecording()

        val file = audioFile
        if (file == null || !file.exists() || file.length() == 0L) {
            setStatus("No audio captured", State.ERROR)
            finish()
            return
        }

        val api = ApiClient.create(Config.baseUrl, Config.deviceToken) ?: run {
            setStatus(getString(R.string.demo_error_token), State.ERROR)
            finish()
            return
        }

        isSending = true
        setStatus(getString(R.string.rec_sending_audio), State.LOADING)
        binding.rockyImage.setImageResource(R.drawable.ic_rocky_normal)

        lifecycleScope.launch {
            try {
                val bytes = withContext(Dispatchers.IO) { file.readBytes() }
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                val body = AudioBody(
                    audio_base64 = base64,
                    audio_content_type = "audio/mp4"
                )
                val resp = withContext(Dispatchers.IO) { api.reportAudio(body) }
                if (resp.isSuccessful) {
                    setStatus(getString(R.string.rec_audio_sent), State.SUCCESS)
                } else {
                    setStatus("Error ${resp.code()}", State.ERROR)
                }
            } catch (e: Exception) {
                setStatus(getString(R.string.demo_error_network), State.ERROR)
            } finally {
                isSending = false
                delay(1_500)
                finish()
            }
        }
    }

    // ─── UI helpers ──────────────────────────────────────────────────────────────

    private enum class State { RECORDING, LOADING, SUCCESS, ERROR }

    private fun setStatus(text: String, state: State) {
        binding.statusText.text = text
        binding.statusText.setTextColor(
            when (state) {
                State.RECORDING -> getColor(R.color.rocky_slate_600)
                State.LOADING   -> getColor(R.color.rocky_slate_400)
                State.SUCCESS   -> getColor(R.color.rocky_emerald_dark)
                State.ERROR     -> getColor(R.color.rocky_rose_dark)
            }
        )
    }
}
