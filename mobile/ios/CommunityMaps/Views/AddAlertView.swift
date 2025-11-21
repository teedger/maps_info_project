import SwiftUI
import PhotosUI

struct AddAlertView: View {
    @ObservedObject var viewModel: MapViewModel
    @Environment(\.dismiss) var dismiss

    @State private var selectedCategory = ""
    @State private var description = ""
    @State private var severity = "medium"
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var isSubmitting = false

    var body: some View {
        NavigationView {
            Form {
                Section("Category") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 12) {
                        ForEach(viewModel.categories) { category in
                            CategoryButton(
                                category: category,
                                isSelected: selectedCategory == category.id
                            ) {
                                selectedCategory = category.id
                            }
                        }
                    }
                    .padding(.vertical, 8)
                }

                Section("Description") {
                    TextEditor(text: $description)
                        .frame(minHeight: 100)
                }

                Section("Severity") {
                    Picker("Severity", selection: $severity) {
                        Text("Low").tag("low")
                        Text("Medium").tag("medium")
                        Text("High").tag("high")
                    }
                    .pickerStyle(.segmented)
                }

                Section("Photo") {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 200)
                            .cornerRadius(8)

                        Button("Remove Photo", role: .destructive) {
                            selectedImage = nil
                        }
                    } else {
                        Button("Add Photo") {
                            showingImagePicker = true
                        }
                    }
                }
            }
            .navigationTitle("Report Alert")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") {
                        submitAlert()
                    }
                    .disabled(selectedCategory.isEmpty || isSubmitting)
                }
            }
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(image: $selectedImage)
            }
        }
    }

    private func submitAlert() {
        isSubmitting = true

        // Get current location from region center
        let lat = viewModel.region.center.latitude
        let lng = viewModel.region.center.longitude

        // Convert image to base64 if present
        var photoData: String?
        if let image = selectedImage,
           let data = image.jpegData(compressionQuality: 0.7) {
            photoData = "data:image/jpeg;base64,\(data.base64EncodedString())"
        }

        let request = NewAlertRequest(
            latitude: lat,
            longitude: lng,
            category: selectedCategory,
            description: description,
            severity: severity,
            photo: photoData
        )

        Task {
            do {
                try await viewModel.createAlert(request)
                dismiss()
            } catch {
                print("Failed to create alert: \(error)")
            }
            isSubmitting = false
        }
    }
}

// MARK: - Category Button
struct CategoryButton: View {
    let category: Category
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(category.icon)
                    .font(.title2)
                Text(category.name)
                    .font(.caption2)
                    .lineLimit(1)
            }
            .frame(width: 70, height: 60)
            .background(isSelected ? Color.blue.opacity(0.2) : Color(.systemGray6))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
        .foregroundColor(.primary)
    }
}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }
    }
}
