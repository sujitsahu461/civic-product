# CIVIC — citizen web app and mobile app

Citizen-facing app for CivicSetu: report civic problems, track them and receive updates.
See the repository root `README.md` (section 15) for how this fits the platform.

- Web/PWA prototype: root of this folder (`index.html`, `server.js`, `dist/`). Source is not in git yet.
- Mobile app: `mobile/` (Expo SDK 54). See `docs/ANDROID_BUILD.md`.
- Design documents: `docs/`.

## Run the web app locally

```bash
npm ci
npm run dev      # http://localhost:3000
npm run build && npm start   # production server (server.js)
```

Set `APP_URL` in `.env.local` if needed (see `.env.example`).
