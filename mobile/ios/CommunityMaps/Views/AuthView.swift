import SwiftUI

struct AuthView: View {
    @ObservedObject var viewModel: MapViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var isLogin = true
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var errorMessage = ""
    @State private var isLoading = false

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Tab Selector
                Picker("", selection: $isLogin) {
                    Text("Login").tag(true)
                    Text("Register").tag(false)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)

                VStack(spacing: 16) {
                    if !isLogin {
                        TextField("Username", text: $username)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                    }

                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())

                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }

                    Button(action: submit) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text(isLogin ? "Login" : "Register")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                    .disabled(isLoading)
                }
                .padding()

                Spacer()
            }
            .navigationTitle(isLogin ? "Login" : "Register")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func submit() {
        errorMessage = ""
        isLoading = true

        Task {
            do {
                if isLogin {
                    try await viewModel.login(email: email, password: password)
                } else {
                    try await viewModel.register(username: username, email: email, password: password)
                }
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
