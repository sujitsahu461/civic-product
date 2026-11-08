# CivicSetu mobile conversion baseline

Date: 2026-10-14

## Verified

- The supplied root project is a React + Vite + TypeScript web/PWA prototype; it is not a React Native application.
- The root project has no Git metadata, so no branch could be created there. The existing web source was preserved.
- A sibling Django project exists at `CivicSetu-V1-Working-Copy/CIVICSETU MINOR PROJECT/-CivicSetu-AI-Powered-Civic-Engagement-Platform` and contains `schema.yml`, `manage.py`, `apps/`, and `config/`.
- The schema documents JWT email/password authentication, citizen registration, complaint list/detail/create/track/timeline routes, notifications, profile routes, departments, feedback, and AI routes.
- The prototype currently seeds complaints in `localStorage`, generates local tracking IDs, simulates authentication/biometrics, and marks offline queue entries as synced without server acknowledgement.

## Added

`mobile/` is the first native foundation: Expo configuration, safe-area navigation, typed Django API client, SecureStore session storage, native-ready report/list/profile screens, and truthful draft-only offline handling.

## Blocked pending backend/device access

- The schema is available, but no running Django API URL, test credentials, or live endpoint responses were available in this workspace. Response fixtures and integration tests still need to be added against a non-production backend.
- The schema does not document an idempotency key for complaint creation. Offline submission is therefore draft-only in the mobile foundation.
- No Android SDK/emulator or Expo/EAS credentials were verified, so an APK has not been claimed.

## Checks run

- `npm run build` (root web prototype): PASS.
- `npx tsc --noEmit -p mobile/tsconfig.json` (native workspace): PASS.
- `npm run dev` and `GET http://localhost:3000/`: PASS, HTTP 200.
- `npx expo-doctor`: BLOCKED because the environment could not fetch the `expo-doctor` package from npm (`EACCES`).

## Cleanup log

Removed after reference checks:

- `src/components/AmbientEnvironment.tsx`, `CivicCard.tsx`, `TopBar.tsx`: no imports or route references.
- `src/screens/GuestInfoModal.tsx`: no imports or route references.
- `server.ts`: duplicate server source; the active `start` script uses `server.js`.
- `bun.lock`: Bun is not the configured package manager; npm lockfiles are authoritative.
- `metadata.json`: no build, runtime, or documentation reference.
- Unused root dependencies: `@google/genai`, `dotenv`, `motion`, `tsx`, `autoprefixer`, `esbuild`, `@types/express`.
- Unused mobile dependencies/plugins: NetInfo, native-stack, haptics, image picker, location, and native icons. They can be reintroduced when those features are implemented.

Retained intentionally: `public/manifest.json` and `public/sw.js` are referenced by the current web app; `server.js` and `dist/` are required for the configured production server; `mongoGeospatial.ts` is imported by `CivicMapScreen`.

## Phase 2 implementation checks

- `npm run typecheck` in `mobile/`: PASS.
- `npx expo install --check`: PASS — dependencies are up to date.
- `npx expo export --platform android`: PASS — Android JavaScript bundle exported to `mobile/dist/`.
- `npm run build` at the root: PASS.
- `GET http://localhost:3000/`: PASS, HTTP 200.
- Backend source audit: PASS for route existence, methods, serializers, permissions, JWT refresh, complaint multipart fields, pagination, notification envelope, and profile update fields.
- Live API integration: BLOCKED — no reachable non-production Django URL or test credentials were available.

## Phase 3 checks

- `npm run typecheck` in `mobile/`: PASS.
- `npx expo install --check` after native dependency changes: PASS.
- `npx expo export --platform android` after Phase 3 changes: PASS; 890 modules bundled.
- Root `npm run build`: PASS.
- Live API, physical-device, and installable APK verification: BLOCKED.
