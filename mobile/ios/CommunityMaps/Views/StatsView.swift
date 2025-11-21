import SwiftUI

struct StatsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var stats: Stats?
    @State private var isLoading = true

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("Loading stats...")
                } else if let stats = stats {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Overview Cards
                            LazyVGrid(columns: [
                                GridItem(.flexible()),
                                GridItem(.flexible())
                            ], spacing: 12) {
                                StatCard(title: "Total Alerts", value: "\(stats.totalAlerts)", icon: "exclamationmark.triangle.fill", color: .blue)
                                StatCard(title: "Active Users", value: "\(stats.totalUsers)", icon: "person.2.fill", color: .green)
                                StatCard(title: "Comments", value: "\(stats.totalComments)", icon: "bubble.left.fill", color: .purple)
                                StatCard(title: "Last 24h", value: "\(stats.alertsLast24h)", icon: "clock.fill", color: .orange)
                            }

                            // By Category
                            VStack(alignment: .leading, spacing: 8) {
                                Text("By Category")
                                    .font(.headline)

                                ForEach(stats.byCategory, id: \.category) { item in
                                    HStack {
                                        Text(item.category.capitalized)
                                        Spacer()
                                        Text("\(item.count)")
                                            .fontWeight(.semibold)
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .shadow(radius: 2)

                            // By Severity
                            VStack(alignment: .leading, spacing: 8) {
                                Text("By Severity")
                                    .font(.headline)

                                ForEach(stats.bySeverity, id: \.severity) { item in
                                    HStack {
                                        Circle()
                                            .fill(severityColor(item.severity))
                                            .frame(width: 12, height: 12)
                                        Text(item.severity.capitalized)
                                        Spacer()
                                        Text("\(item.count)")
                                            .fontWeight(.semibold)
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .shadow(radius: 2)

                            // Top Contributors
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Top Contributors")
                                    .font(.headline)

                                ForEach(Array(stats.topContributors.enumerated()), id: \.offset) { index, contributor in
                                    HStack {
                                        Text("\(index + 1).")
                                            .foregroundColor(.secondary)
                                        Text(contributor.username)
                                        Spacer()
                                        VStack(alignment: .trailing) {
                                            Text("\(contributor.alertCount) alerts")
                                                .font(.caption)
                                            Text("\(contributor.totalUpvotes) upvotes")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .shadow(radius: 2)
                        }
                        .padding()
                    }
                } else {
                    Text("Failed to load stats")
                        .foregroundColor(.secondary)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Community Stats")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                loadStats()
            }
        }
    }

    private func severityColor(_ severity: String) -> Color {
        switch severity.lowercased() {
        case "high": return .red
        case "medium": return .orange
        default: return .yellow
        }
    }

    private func loadStats() {
        Task {
            do {
                stats = try await APIService.shared.getStats()
            } catch {
                print("Failed to load stats: \(error)")
            }
            isLoading = false
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            Text(value)
                .font(.title)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}
