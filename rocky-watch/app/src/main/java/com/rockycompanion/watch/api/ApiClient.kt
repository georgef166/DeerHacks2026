package com.rockycompanion.watch.api

import android.util.Log
import com.rockycompanion.watch.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private const val TAG = "ApiClient"
    private const val DEFAULT_BASE_URL = "https://your-app.vercel.app/"

    fun create(baseUrl: String?, bearerToken: String?): RockyApi? {
        val url = (baseUrl?.takeIf { it.isNotBlank() } ?: DEFAULT_BASE_URL).let {
            if (!it.endsWith("/")) "$it/" else it
        }
        val token = bearerToken?.takeIf { it.isNotBlank() }
        if (token.isNullOrBlank()) {
            Log.w(TAG, "No bearer token configured; API calls will fail with 401")
        }

        val logging = HttpLoggingInterceptor { message -> Log.d(TAG, message) }.apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                if (!token.isNullOrBlank()) {
                    request.addHeader("Authorization", "Bearer $token")
                }
                chain.proceed(request.build())
            }
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(url)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        return retrofit.create(RockyApi::class.java)
    }
}
