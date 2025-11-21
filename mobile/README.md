# Community Maps Mobile Apps

Native mobile applications for iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose).

## Project Structure

```
mobile/
├── ios/
│   └── CommunityMaps/
│       ├── Models/
│       │   └── Models.swift
│       ├── Services/
│       │   └── APIService.swift
│       ├── ViewModels/
│       │   └── MapViewModel.swift
│       └── Views/
│           ├── ContentView.swift
│           ├── AddAlertView.swift
│           ├── AlertDetailView.swift
│           ├── AuthView.swift
│           └── StatsView.swift
└── android/
    └── app/src/main/java/com/communitymaps/
        ├── models/
        │   └── Models.kt
        ├── services/
        │   ├── ApiService.kt
        │   └── RetrofitClient.kt
        ├── viewmodels/
        │   └── MapViewModel.kt
        ├── ui/
        │   ├── screens/
        │   │   ├── MainScreen.kt
        │   │   └── Dialogs.kt
        │   └── theme/
        │       └── Theme.kt
        └── MainActivity.kt
```

## iOS Setup

1. Open `ios/CommunityMaps` in Xcode
2. Add your Apple Developer Team ID
3. Update the API base URL in `APIService.swift` if needed
4. Build and run on simulator or device

### Requirements
- Xcode 15+
- iOS 16+
- Swift 5.9+

## Android Setup

1. Open `android/` in Android Studio
2. Add your Google Maps API key to `local.properties`:
   ```
   MAPS_API_KEY=your_api_key_here
   ```
3. Sync Gradle files
4. Build and run on emulator or device

### Requirements
- Android Studio Hedgehog+
- Kotlin 1.9+
- Min SDK 24 (Android 7.0)
- Target SDK 34 (Android 14)

## Features

- Interactive map with alert markers
- Create/view/delete alerts
- Upvote alerts
- Comment on alerts
- User authentication
- Search and filter alerts
- Community statistics
- Photo attachments

## API Configuration

Both apps connect to the backend API at:
- iOS: `http://localhost:3001/api`
- Android: `http://10.0.2.2:3001/api` (Android emulator localhost)

Update these URLs in the respective service files for production deployment.
