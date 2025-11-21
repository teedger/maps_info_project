import Foundation
import MapKit
import CoreLocation

@MainActor
class MapViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var alerts: [Alert] = []
    @Published var categories: [Category] = []
    @Published var activeFilters: Set<String> = []
    @Published var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.006),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )
    @Published var isLoggedIn = false
    @Published var username: String?
    @Published var nearbyCount = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let locationManager = CLLocationManager()
    private var userLocation: CLLocationCoordinate2D?

    var filteredAlerts: [Alert] {
        alerts.filter { activeFilters.contains($0.category) }
    }

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        checkAuth()
    }

    // MARK: - Data Loading
    func loadData() async {
        isLoading = true
        do {
            async let alertsTask = APIService.shared.getAlerts()
            async let categoriesTask = APIService.shared.getCategories()

            let (fetchedAlerts, fetchedCategories) = try await (alertsTask, categoriesTask)

            self.alerts = fetchedAlerts
            self.categories = fetchedCategories
            self.activeFilters = Set(fetchedCategories.map { $0.id })

            if let location = userLocation {
                await loadNearbyAlerts(lat: location.latitude, lng: location.longitude)
            }
        } catch {
            errorMessage = "Failed to load data: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func loadNearbyAlerts(lat: Double, lng: Double) async {
        do {
            let nearby = try await APIService.shared.getNearbyAlerts(lat: lat, lng: lng, radius: 2)
            nearbyCount = nearby.count
        } catch {
            print("Failed to load nearby alerts: \(error)")
        }
    }

    func search(query: String) {
        Task {
            do {
                if query.isEmpty {
                    alerts = try await APIService.shared.getAlerts()
                } else {
                    alerts = try await APIService.shared.getAlerts(search: query)
                }
            } catch {
                errorMessage = "Search failed: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Filters
    func toggleFilter(_ categoryId: String) {
        if activeFilters.contains(categoryId) {
            activeFilters.remove(categoryId)
        } else {
            activeFilters.insert(categoryId)
        }
    }

    // MARK: - Alert Actions
    func createAlert(_ request: NewAlertRequest) async throws {
        let newAlert = try await APIService.shared.createAlert(request)
        alerts.insert(newAlert, at: 0)
    }

    func upvoteAlert(_ id: String) async {
        do {
            let updated = try await APIService.shared.upvoteAlert(id: id)
            if let index = alerts.firstIndex(where: { $0.id == id }) {
                alerts[index] = updated
            }
        } catch {
            errorMessage = "Failed to upvote: \(error.localizedDescription)"
        }
    }

    func deleteAlert(_ id: String) async {
        do {
            try await APIService.shared.deleteAlert(id: id)
            alerts.removeAll { $0.id == id }
        } catch {
            errorMessage = "Failed to delete: \(error.localizedDescription)"
        }
    }

    // MARK: - Location
    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }

    func centerOnUser() {
        if let location = userLocation {
            region = MKCoordinateRegion(
                center: location,
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
        } else {
            requestLocationPermission()
            locationManager.startUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        userLocation = location.coordinate
        locationManager.stopUpdatingLocation()

        Task {
            await loadNearbyAlerts(lat: location.coordinate.latitude, lng: location.coordinate.longitude)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error)")
    }

    // MARK: - Auth
    func checkAuth() {
        if let userData = UserDefaults.standard.data(forKey: "user"),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            isLoggedIn = true
            username = user.username
        }
    }

    func login(email: String, password: String) async throws {
        let response = try await APIService.shared.login(email: email, password: password)
        let userData = try JSONEncoder().encode(response.user)
        UserDefaults.standard.set(userData, forKey: "user")
        isLoggedIn = true
        username = response.user.username
    }

    func register(username: String, email: String, password: String) async throws {
        let response = try await APIService.shared.register(username: username, email: email, password: password)
        let userData = try JSONEncoder().encode(response.user)
        UserDefaults.standard.set(userData, forKey: "user")
        isLoggedIn = true
        self.username = response.user.username
    }

    func logout() {
        APIService.shared.logout()
        isLoggedIn = false
        username = nil
    }
}
