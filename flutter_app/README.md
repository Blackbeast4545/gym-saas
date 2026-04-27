# FitNexus Flutter Member App

## Setup

```bash
cd flutter_app
flutter pub get
```

### Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app (package: `com.gymsaas.member`)
3. Download `google-services.json` → place in `android/app/`
4. Add an iOS app → download `GoogleService-Info.plist` → place in `ios/Runner/`
5. Enable Firebase Cloud Messaging in Firebase Console

### Android permissions (already in manifest)
```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.INTERNET"/>
```

## Run

```bash
# Connect device or start emulator
flutter run

# Release build
flutter build apk --release
flutter build appbundle --release   # for Play Store
```

## App Config

Edit `lib/utils/constants.dart`:
```dart
// Android emulator
static const String baseUrl = 'http://10.0.2.2:8000/api/v1';

// Real device on same WiFi (use your machine's local IP)
static const String baseUrl = 'http://192.168.1.x:8000/api/v1';

// Production
static const String baseUrl = 'https://your-domain.com/api/v1';
```

## Screens

| Screen | Description |
|--------|-------------|
| Splash | Auto-login check |
| Login | Gym ID + Phone + OTP |
| Dashboard | Membership card, stats, streak |
| Workout | Day-by-day exercise plan |
| Check In | QR scanner + attendance history |
| Payments | Payment receipts list |
| Diet | Meal plan with macros |

## Member Login Flow

1. Member enters **Gym ID** (provided by gym owner)
2. Enters **phone number** (registered in gym)
3. Receives **OTP via SMS** (2Factor.in)
4. OTP verified → JWT token stored securely
5. Auto-login on next launch

## Features
- QR scanner for gym check-in
- Streak tracking
- Push notifications (FCM)
- Offline-friendly token storage
- Pull-to-refresh on all screens
