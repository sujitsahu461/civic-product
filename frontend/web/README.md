# CivicSetu website (`frontend/web`)

React 19 + TypeScript + Vite single-page app for citizens, officers and super admins.
It talks to the shared Django API in [`backend/`](../../backend) under `/api/v1/`.

```bash
npm ci
npm run dev      # http://localhost:5173, proxies /api and /media to the backend on port 8000
npm run lint
npm run typecheck  # TypeScript check (no output files)
npm run build    # production bundle in dist/
npm run deploy   # build, then copy into backend/static/react and backend/templates/index.html
```

Run `npm run deploy` after changing the website so the copy Django serves at http://127.0.0.1:8000/ is current.

See the repository root `README.md` (section 14) for portals, state, languages and maps.
