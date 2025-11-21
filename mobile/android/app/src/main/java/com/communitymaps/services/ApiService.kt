package com.communitymaps.services

import com.communitymaps.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @GET("auth/me")
    suspend fun getCurrentUser(@Header("Authorization") token: String): Response<User>

    // Alerts
    @GET("alerts")
    suspend fun getAlerts(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("status") status: String = "active"
    ): Response<List<Alert>>

    @GET("alerts/nearby")
    suspend fun getNearbyAlerts(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius") radius: Double = 5.0
    ): Response<List<Alert>>

    @GET("alerts/{id}")
    suspend fun getAlert(@Path("id") id: String): Response<Alert>

    @POST("alerts")
    suspend fun createAlert(
        @Header("Authorization") token: String,
        @Body alert: NewAlertRequest
    ): Response<Alert>

    @POST("alerts/{id}/upvote")
    suspend fun upvoteAlert(@Path("id") id: String): Response<Alert>

    @DELETE("alerts/{id}")
    suspend fun deleteAlert(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<Map<String, String>>

    // Comments
    @GET("alerts/{id}/comments")
    suspend fun getComments(@Path("id") alertId: String): Response<List<Comment>>

    @POST("alerts/{id}/comments")
    suspend fun addComment(
        @Path("id") alertId: String,
        @Body comment: CommentRequest
    ): Response<Comment>

    // Categories
    @GET("categories")
    suspend fun getCategories(): Response<List<Category>>

    // Stats
    @GET("stats")
    suspend fun getStats(): Response<Stats>

    // User
    @GET("users/{id}/alerts")
    suspend fun getUserAlerts(@Path("id") userId: String): Response<List<Alert>>

    @GET("users/{id}/stats")
    suspend fun getUserStats(@Path("id") userId: String): Response<Map<String, Any>>
}
