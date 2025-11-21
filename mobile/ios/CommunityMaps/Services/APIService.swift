import Foundation

class APIService {
    static let shared = APIService()
    private let baseURL = "http://localhost:3001/api"

    private var token: String? {
        get { UserDefaults.standard.string(forKey: "authToken") }
        set { UserDefaults.standard.set(newValue, forKey: "authToken") }
    }

    private init() {}

    // MARK: - Generic Request
    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        requiresAuth: Bool = false
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if requiresAuth, let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Auth
    func login(email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(["email": email, "password": password])
        let response: AuthResponse = try await request(endpoint: "/auth/login", method: "POST", body: body)
        self.token = response.token
        return response
    }

    func register(username: String, email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode([
            "username": username,
            "email": email,
            "password": password
        ])
        let response: AuthResponse = try await request(endpoint: "/auth/register", method: "POST", body: body)
        self.token = response.token
        return response
    }

    func logout() {
        self.token = nil
        UserDefaults.standard.removeObject(forKey: "user")
    }

    // MARK: - Alerts
    func getAlerts(category: String? = nil, search: String? = nil) async throws -> [Alert] {
        var endpoint = "/alerts?"
        if let category = category { endpoint += "category=\(category)&" }
        if let search = search { endpoint += "search=\(search)&" }
        return try await request(endpoint: endpoint)
    }

    func getAlert(id: String) async throws -> Alert {
        return try await request(endpoint: "/alerts/\(id)")
    }

    func getNearbyAlerts(lat: Double, lng: Double, radius: Double = 5) async throws -> [Alert] {
        return try await request(endpoint: "/alerts/nearby?lat=\(lat)&lng=\(lng)&radius=\(radius)")
    }

    func createAlert(_ alert: NewAlertRequest) async throws -> Alert {
        let body = try JSONEncoder().encode(alert)
        return try await request(endpoint: "/alerts", method: "POST", body: body, requiresAuth: true)
    }

    func upvoteAlert(id: String) async throws -> Alert {
        return try await request(endpoint: "/alerts/\(id)/upvote", method: "POST")
    }

    func deleteAlert(id: String) async throws {
        let _: [String: String] = try await request(endpoint: "/alerts/\(id)", method: "DELETE", requiresAuth: true)
    }

    // MARK: - Comments
    func addComment(alertId: String, content: String, username: String?) async throws -> Comment {
        var params: [String: String] = ["content": content]
        if let username = username { params["username"] = username }
        let body = try JSONEncoder().encode(params)
        return try await request(endpoint: "/alerts/\(alertId)/comments", method: "POST", body: body, requiresAuth: true)
    }

    // MARK: - Categories
    func getCategories() async throws -> [Category] {
        return try await request(endpoint: "/categories")
    }

    // MARK: - Stats
    func getStats() async throws -> Stats {
        return try await request(endpoint: "/stats")
    }
}

// MARK: - API Errors
enum APIError: Error {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError
}
