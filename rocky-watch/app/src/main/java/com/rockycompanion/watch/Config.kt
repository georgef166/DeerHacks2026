package com.rockycompanion.watch

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

private const val PREFS_NAME = "rocky_watch_config"
private const val KEY_BASE_URL = "base_url"
private const val KEY_DEVICE_TOKEN = "device_token"
private const val KEY_HEART_RATE_ELEVATED_THRESHOLD_SEC = "heart_rate_elevated_threshold_sec"

object Config {
    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    var baseUrl: String?
        get() = prefs.getString(KEY_BASE_URL, null)?.takeIf { it.isNotBlank() }
        set(value) = prefs.edit { putString(KEY_BASE_URL, value) }

    var deviceToken: String?
        get() = prefs.getString(KEY_DEVICE_TOKEN, null)?.takeIf { it.isNotBlank() }
        set(value) = prefs.edit { putString(KEY_DEVICE_TOKEN, value) }

    /** How many seconds heart rate must be elevated before we send to backend. */
    var heartRateElevatedThresholdSec: Int
        get() = prefs.getInt(KEY_HEART_RATE_ELEVATED_THRESHOLD_SEC, 10)
        set(value) = prefs.edit { putInt(KEY_HEART_RATE_ELEVATED_THRESHOLD_SEC, value) }

    fun isConfigured(): Boolean = ::prefs.isInitialized && !deviceToken.isNullOrBlank()
}
