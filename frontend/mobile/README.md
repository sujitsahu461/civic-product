# CIVIC citizen app (`frontend/mobile`)

Expo (React Native, SDK 58: React Native 0.88, React 19.3) app for citizens: report civic problems, track them and receive updates.
It talks to the shared Django API in [`backend/`](../../backend). Officers and admins use the website instead.

Needs Node 22.13+, 24.3+ or 26+. Expo Go on the phone must be a version that supports SDK 58.

```bash
npm ci
npm run web        # browser preview on http://127.0.0.1:8081
npm start          # Expo dev server; scan the QR code with Expo Go
npm run typecheck
npm test
```

Set the backend address in `.env` (copy `.env.example`):

| Where the app runs | `EXPO_PUBLIC_CIVICSETU_API_URL` |
| :--- | :--- |
| Browser preview, iOS simulator | `http://127.0.0.1:8000` (default) |
| Android emulator | `http://10.0.2.2:8000` |
| Physical phone | `http://<computer LAN IP>:8000` |

Android builds: see [`docs/mobile/ANDROID_BUILD.md`](../../docs/mobile/ANDROID_BUILD.md). Design documents are in [`docs/mobile/`](../../docs/mobile).
