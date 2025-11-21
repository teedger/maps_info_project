import SwiftUI
import MapKit

struct ContentView: View {
    @StateObject private var viewModel = MapViewModel()
    @State private var showingAddAlert = false
    @State private var showingAuth = false
    @State private var showingStats = false
    @State private var selectedAlert: Alert?
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            ZStack {
                // Map View
                Map(coordinateRegion: $viewModel.region,
                    showsUserLocation: true,
                    annotationItems: viewModel.filteredAlerts) { alert in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(
                        latitude: alert.latitude,
                        longitude: alert.longitude
                    )) {
                        AlertMarkerView(alert: alert, categories: viewModel.categories)
                            .onTapGesture {
                                selectedAlert = alert
                            }
                    }
                }
                .ignoresSafeArea(edges: .bottom)

                // Overlay controls
                VStack {
                    // Search bar
                    HStack {
                        TextField("Search alerts...", text: $searchText)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .onChange(of: searchText) { _ in
                                viewModel.search(query: searchText)
                            }

                        if viewModel.nearbyCount > 0 {
                            Text("\(viewModel.nearbyCount) nearby")
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground).opacity(0.9))

                    // Category filters
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(viewModel.categories) { category in
                                FilterButton(
                                    category: category,
                                    isSelected: viewModel.activeFilters.contains(category.id)
                                ) {
                                    viewModel.toggleFilter(category.id)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6).opacity(0.9))

                    Spacer()

                    // Bottom buttons
                    HStack {
                        // Location button
                        Button(action: { viewModel.centerOnUser() }) {
                            Image(systemName: "location.fill")
                                .padding()
                                .background(Color.white)
                                .clipShape(Circle())
                                .shadow(radius: 2)
                        }

                        Spacer()

                        // Add alert button
                        Button(action: { showingAddAlert = true }) {
                            Image(systemName: "plus")
                                .font(.title2)
                                .foregroundColor(.white)
                                .padding()
                                .background(Color.blue)
                                .clipShape(Circle())
                                .shadow(radius: 4)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Community Maps")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Stats") { showingStats = true }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if viewModel.isLoggedIn {
                        Menu {
                            Button("Profile") { /* Show profile */ }
                            Button("Logout", role: .destructive) { viewModel.logout() }
                        } label: {
                            Text(viewModel.username ?? "User")
                        }
                    } else {
                        Button("Login") { showingAuth = true }
                    }
                }
            }
            .sheet(isPresented: $showingAddAlert) {
                AddAlertView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingAuth) {
                AuthView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingStats) {
                StatsView()
            }
            .sheet(item: $selectedAlert) { alert in
                AlertDetailView(alert: alert, viewModel: viewModel)
            }
        }
        .task {
            await viewModel.loadData()
        }
    }
}

// MARK: - Alert Marker View
struct AlertMarkerView: View {
    let alert: Alert
    let categories: [Category]

    var category: Category? {
        categories.first { $0.id == alert.category }
    }

    var body: some View {
        VStack(spacing: 0) {
            Text(category?.icon ?? "📍")
                .font(.system(size: 20))
                .frame(width: 36, height: 36)
                .background(Color(hex: category?.color ?? "#9b59b6"))
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.white, lineWidth: 2))
                .shadow(radius: 2)
        }
    }
}

// MARK: - Filter Button
struct FilterButton: View {
    let category: Category
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(category.icon)
                Text(category.name)
                    .font(.caption)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.blue.opacity(0.2) : Color.white)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color(hex: category.color), lineWidth: 2)
            )
        }
        .foregroundColor(.primary)
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

#Preview {
    ContentView()
}
