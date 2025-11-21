import Foundation

// MARK: - Alert Model
struct Alert: Codable, Identifiable {
    let id: String
    let userId: String?
    let latitude: Double
    let longitude: Double
    let category: String
    let description: String?
    let severity: String
    let photoUrl: String?
    let createdAt: String
    let expiresAt: String
    let status: String
    let upvotes: Int
    let author: String?
    let comments: [Comment]?
    let distance: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case latitude, longitude, category, description, severity
        case photoUrl = "photo_url"
        case createdAt = "created_at"
        case expiresAt = "expires_at"
        case status, upvotes, author, comments, distance
    }
}

// MARK: - Comment Model
struct Comment: Codable, Identifiable {
    let id: String
    let alertId: String
    let userId: String?
    let username: String
    let content: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case alertId = "alert_id"
        case userId = "user_id"
        case username, content
        case createdAt = "created_at"
    }
}

// MARK: - User Model
struct User: Codable {
    let id: String
    let username: String
    let email: String
}

// MARK: - Category Model
struct Category: Codable, Identifiable {
    let id: String
    let name: String
    let icon: String
    let color: String
}

// MARK: - Auth Response
struct AuthResponse: Codable {
    let token: String
    let user: User
}

// MARK: - Stats Model
struct Stats: Codable {
    let totalAlerts: Int
    let totalUsers: Int
    let totalComments: Int
    let alertsLast24h: Int
    let byCategory: [CategoryCount]
    let bySeverity: [SeverityCount]
    let topContributors: [Contributor]
}

struct CategoryCount: Codable {
    let category: String
    let count: Int
}

struct SeverityCount: Codable {
    let severity: String
    let count: Int
}

struct Contributor: Codable {
    let username: String
    let alertCount: Int
    let totalUpvotes: Int

    enum CodingKeys: String, CodingKey {
        case username
        case alertCount = "alert_count"
        case totalUpvotes = "total_upvotes"
    }
}

// MARK: - New Alert Request
struct NewAlertRequest: Codable {
    let latitude: Double
    let longitude: Double
    let category: String
    let description: String
    let severity: String
    let photo: String?
}
