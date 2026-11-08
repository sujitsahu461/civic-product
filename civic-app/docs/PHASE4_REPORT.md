# CivicSetu Phase 4 report

## A. Implementation

- Added Vitest unit-test setup and scripts.
- Added API validation/timeout tests.
- Added draft synchronization tests for confirmed success, uncertain network outcomes, and concurrent-attempt blocking.
- Added explicit `UNKNOWN` recovery guidance and server-history review actions.
- Added EAS preview APK and production AAB profiles.
- Added Android version code and updated release documentation.

## B. Automated tests

- `npm run test` in `mobile/`: PASS — 2 files, 5 tests.
- `npm run typecheck` in `mobile/`: PASS.
- `npx expo install --check`: PASS.
- `npm run build` at root: PASS.
- Native SQLite persistence, permissions, force-close recovery, and device UI tests: NOT TESTED; require a native runtime/device.

## C. Live backend integration

BLOCKED. No reachable non-production Django URL or test credentials were provided. Backend source contract verification remains documented in `docs/BACKEND_API_CONTRACT.md`.

## D. Offline reliability

SQLite drafts remain account-scoped. Confirmed responses retain real server identifiers. Network/timeout ambiguity becomes `UNKNOWN`, with no blind retry. Foreground user-initiated submission is used; background synchronization is not promised.

## E. Security review

Tokens remain in Expo SecureStore. No passwords, tokens, signing credentials, or API secrets were added. `EXPO_PUBLIC_CIVICSETU_API_URL` remains configuration-only. The current backend still lacks verified server-side complaint idempotency.

## F. Android release

`mobile/eas.json` is configured for an internal APK preview build. No APK was generated or verified because EAS authentication/signing and device access were unavailable.

## G. Remaining blockers

- Reachable staging Django URL and test credentials.
- Native simulator/device for SQLite, permissions, force-close, and UI QA.
- Expo/EAS authentication and signing configuration for APK generation.
- Native integration tests for SQLite and image/location file lifecycle.

## H. Release decision

**TECHNICALLY VALIDATED** — local typecheck, unit tests, dependency compatibility, and web build pass; live backend, native device, and APK evidence remain outstanding.
