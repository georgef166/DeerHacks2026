package com.rockycompanion.watch

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import com.rockycompanion.watch.databinding.ActivitySettingsBinding

class SettingsActivity : ComponentActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Config.init(this)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.baseUrlEdit.setText(Config.baseUrl ?: "")
        binding.deviceTokenEdit.setText(Config.deviceToken ?: "")

        binding.saveButton.setOnClickListener { save() }
    }

    private fun save() {
        val url = binding.baseUrlEdit.text?.toString()?.trim()
        val token = binding.deviceTokenEdit.text?.toString()?.trim()
        Config.baseUrl = url?.ifEmpty { null }
        Config.deviceToken = token?.ifEmpty { null }
        Toast.makeText(this, R.string.saved, Toast.LENGTH_SHORT).show()
        finish()
    }
}