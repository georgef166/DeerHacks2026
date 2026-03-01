package com.rockycompanion.watch.sensors

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Fetches last known or current location for incident reports.
 * Optional: only used when permission is granted and watch has location capability.
 */
class LocationCollector(context: Context) {

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)
    private val appContext = context.applicationContext

    suspend fun getLastLocation(): Pair<Double, Double>? = suspendCancellableCoroutine { cont ->
        if (ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            cont.resume(null)
            return@suspendCancellableCoroutine
        }
        val cancelToken = CancellationTokenSource()
        cont.invokeOnCancellation { cancelToken.cancel() }
        fusedClient.getCurrentLocation(Priority.PRIORITY_LOW_POWER, cancelToken.token)
            .addOnSuccessListener { location ->
                if (location != null) {
                    cont.resume(location.latitude to location.longitude)
                } else {
                    cont.resume(null)
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "Location failed", e)
                cont.resume(null)
            }
    }

    companion object {
        private const val TAG = "LocationCollector"
    }
}
