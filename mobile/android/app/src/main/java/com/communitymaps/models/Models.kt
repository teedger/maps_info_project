package com.communitymaps.models

import com.google.gson.annotations.SerializedName

data class Alert(
    val id: String,
    @SerializedName("user_id") val userId: String?,
    val latitude: Double,
    val longitude: Double,
    val category: String,
    val description: String?,
    val severity: String,
    @SerializedName("photo_url") val photoUrl: String?,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("expires_at") val expiresAt: String,
    val status: String,
    val upvotes: Int,
    val author: String?,
    val comments: List<Comment>?,
    val distance: Double?
)

data class Comment(
    val id: String,
    @SerializedName("alert_id") val alertId: String,
    @SerializedName("user_id") val userId: String?,
    val username: String,
    val content: String,
    @SerializedName("created_at") val createdAt: String
)

data class User(
    val id: String,
    val username: String,
    val email: String
)

data class Category(
    val id: String,
    val name: String,
    val icon: String,
    val color: String
)

data class AuthResponse(
    val token: String,
    val user: User
)

data class Stats(
    val totalAlerts: Int,
    val totalUsers: Int,
    val totalComments: Int,
    val alertsLast24h: Int,
    val byCategory: List<CategoryCount>,
    val bySeverity: List<SeverityCount>,
    val topContributors: List<Contributor>
)

data class CategoryCount(
    val category: String,
    val count: Int
)

data class SeverityCount(
    val severity: String,
    val count: Int
)

data class Contributor(
    val username: String,
    @SerializedName("alert_count") val alertCount: Int,
    @SerializedName("total_upvotes") val totalUpvotes: Int
)

data class NewAlertRequest(
    val latitude: Double,
    val longitude: Double,
    val category: String,
    val description: String,
    val severity: String,
    val photo: String?
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String
)

data class CommentRequest(
    val content: String,
    val username: String?
)
