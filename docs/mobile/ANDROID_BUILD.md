# CivicSetu Android build

## Current configuration

- Expo SDK 54.
- Android application ID: `com.civicsetu.mobile`.
- Version: `0.1.0`.
- API URL: `EXPO_PUBLIC_CIVICSETU_API_URL`.
- Native permissions are configured only for SecureStore, image selection, and foreground location.

## Checks completed

`npx expo install --check` and `npx expo export --platform android` have passed. The export is a JavaScript bundle, not an installable APK.

## Local development

```powershell
cd frontend/mobile
$env:EXPO_PUBLIC_CIVICSETU_API_URL="http://10.0.2.2:8000"
npx expo start
```

For a physical Android device, use the development computer's reachable LAN IP instead of `10.0.2.2`. For hosted use, configure the HTTPS Django URL. Never commit a secret or machine-specific production URL.

## APK build

The repository now contains `mobile/eas.json` with a `preview` profile that requests an internal installable APK and a `production` profile for an Android App Bundle.

```powershell
cd frontend/mobile
npx eas build --platform android --profile preview
```

The command requires an authenticated Expo/EAS account and signing setup. Do not put credentials in source files.

## APK status

Expo/EAS authentication, signing credentials, and a physical device were not verified in this workspace. Therefore no installable APK is claimed. Verify the resulting artifact before distribution.
