# Archived: CIVIC web/PWA prototype

This folder holds what was left of the older citizen-only web prototype that used to sit at the root of `civic-app/`.

**It does not run.** `index.html` loads `/src/main.tsx` and `server.js` serves `dist/`, but neither the source (`src/`) nor a build (`dist/`) is in this repository. It never called the Django backend: it kept data in browser `localStorage`, and `server.js` only had demo geo endpoints over four hard-coded complaints.

The CIVIC mobile app in [`frontend/mobile`](../../frontend/mobile) replaces it. Its design documents moved to [`docs/mobile/`](../../docs/mobile).

Kept only for reference; safe to delete once nobody needs it.
