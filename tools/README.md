# Tools

Helpers that are not part of the backend or either frontend.

| Path | What it does | How to run (from the repository root) |
| :--- | :--- | :--- |
| `showcase/` | Page that shows the website and the mobile app side by side, both on the same backend | Start the backend (port 8000) and `npm run web` in `frontend/mobile` (port 8081), then `python -m http.server 8090 --bind 127.0.0.1 --directory tools/showcase` and open http://127.0.0.1:8090/ |
| `reports/` | Generators for the PDF reports in `docs/reports/` | `pip install -r tools/reports/requirements.txt`, then `cd docs/reports` and `python ../../tools/reports/generate_progress_report.py` |
| `toggle_review_mode.py` | Legacy academic-review switch (edits `REVIEW_PHASE` in `backend/.env` and `frontend/web/src/config/reviewConfig.ts`) | `python tools/toggle_review_mode.py status` |
