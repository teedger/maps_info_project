import SwiftUI

struct AlertDetailView: View {
    let alert: Alert
    let onUpvote: () -> Void
    let onDelete: (() -> Void)?
    @Environment(\.dismiss) private var dismiss

    @State private var comments: [Comment] = []
    @State private var newComment = ""
    @State private var isLoading = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Photo
                    if let photoUrl = alert.photoUrl, !photoUrl.isEmpty {
                        AsyncImage(url: URL(string: photoUrl)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                        }
                        .frame(height: 200)
                        .clipped()
                        .cornerRadius(12)
                    }

                    // Alert Info
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(alert.category.capitalized)
                                .font(.headline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(severityColor.opacity(0.2))
                                .foregroundColor(severityColor)
                                .cornerRadius(8)

                            Spacer()

                            Text(alert.severity.capitalized)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        if let description = alert.description {
                            Text(description)
                                .font(.body)
                        }

                        HStack {
                            if let author = alert.author {
                                Text("By \(author)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Text(formatDate(alert.createdAt))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)

                    // Actions
                    HStack(spacing: 16) {
                        Button(action: onUpvote) {
                            HStack {
                                Image(systemName: "arrow.up.circle.fill")
                                Text("\(alert.upvotes)")
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                        }

                        if let onDelete = onDelete {
                            Button(action: onDelete) {
                                HStack {
                                    Image(systemName: "trash.fill")
                                    Text("Delete")
                                }
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(Color.red.opacity(0.1))
                                .foregroundColor(.red)
                                .cornerRadius(8)
                            }
                        }
                    }

                    // Comments Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Comments")
                            .font(.headline)

                        if comments.isEmpty {
                            Text("No comments yet")
                                .foregroundColor(.secondary)
                                .italic()
                        } else {
                            ForEach(comments) { comment in
                                CommentRow(comment: comment)
                            }
                        }

                        // Add Comment
                        HStack {
                            TextField("Add a comment...", text: $newComment)
                                .textFieldStyle(RoundedBorderTextFieldStyle())

                            Button(action: addComment) {
                                Image(systemName: "paperplane.fill")
                                    .foregroundColor(.blue)
                            }
                            .disabled(newComment.isEmpty)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Alert Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                loadComments()
            }
        }
    }

    private var severityColor: Color {
        switch alert.severity.lowercased() {
        case "high": return .red
        case "medium": return .orange
        default: return .yellow
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return dateString
    }

    private func loadComments() {
        Task {
            do {
                comments = try await APIService.shared.getComments(alertId: alert.id)
            } catch {
                print("Failed to load comments: \(error)")
            }
        }
    }

    private func addComment() {
        guard !newComment.isEmpty else { return }

        Task {
            do {
                let comment = try await APIService.shared.addComment(
                    alertId: alert.id,
                    content: newComment,
                    username: "Anonymous"
                )
                comments.append(comment)
                newComment = ""
            } catch {
                print("Failed to add comment: \(error)")
            }
        }
    }
}

struct CommentRow: View {
    let comment: Comment

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(comment.username)
                    .font(.caption)
                    .fontWeight(.semibold)
                Spacer()
                Text(formatDate(comment.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            Text(comment.content)
                .font(.subheadline)
        }
        .padding(8)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = RelativeDateTimeFormatter()
            return displayFormatter.localizedString(for: date, relativeTo: Date())
        }
        return dateString
    }
}
