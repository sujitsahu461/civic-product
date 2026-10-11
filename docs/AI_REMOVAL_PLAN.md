# CivicSetu V1 — AI/ML Removal & Deterministic Replacement Plan

## 1. Overview
In accordance with the CivicSetu V1 specification, all machine learning inference, pickle model dependencies, AI-based triage, and external AI services are decommissioned from the core runtime. The platform transitions to explicit citizen category selection and deterministic, rule-based operational prioritization.

---

## 2. Decommissioning Matrix

| Component | Previous AI Implementation | V1 Deterministic Replacement |
| :--- | :--- | :--- |
| **Category Classification** | TF-IDF Vectorizer + Scikit-Learn Logistic Regression / SVM | Direct citizen category selection (`ROAD`, `WATER`, `ELECTRICITY`, `DRAINAGE`, `SANITATION`) with clear visual cards & icons. |
| **Priority Evaluation** | Scikit-Learn priority model (`priority_model.pkl`) | Configurable deterministic rule engine: checks emergency urgency keywords (`fire`, `live wire`, `explosion`, `burst`, `flooding`, `contamination`) to elevate to `URGENT` or `HIGH`; otherwise respects user selection or defaults to `MEDIUM`. |
| **Department Routing** | ML department classifier (`department_model.pkl`) | Deterministic Category-to-Department mapping table (`ROAD` ➔ Road Infrastructure, `WATER` ➔ Water Supply, etc.). |
| **Duplicate Detection** | AI TF-IDF cosine similarity scan | Retain standard SQL/geospatial exact matching where applicable; decommission AI similarity endpoints. |
| **Model Pickles** | `*.pkl` root binary files | Runtime decoupled; no pickle files loaded on server boot or request path. |
| **Frontend UI** | Live debounced AI analysis banner & auto-fill | Immediate responsive category selection tiles, immediate priority options, zero network latency. |

---

## 3. Backend Implementation Steps
1. **`apps/complaints/services.py`**:
   - Refactor `create_complaint`: Remove imports of `AITriageService` and `AIEngineService`.
   - Implement `evaluate_deterministic_priority(title, description, category, requested_priority)`.
   - Remove calls to `AIPredictionLog`.
2. **`config/urls.py`**:
   - Safely remove or decommission `api/v1/ai/` route.
3. **`config/settings/base.py`**:
   - Safely adjust `INSTALLED_APPS` to decouple `apps.ai_engine` and `apps.ai_predictions` from runtime.

---

## 4. Frontend Implementation Steps
1. **`frontend/src/pages/citizen/SubmitComplaint.tsx`**:
   - Remove `aiService` import and live debounced classification `useEffect`.
   - Provide an accessible category selection interface with icons and descriptions for English, Odia, and Hindi.
   - Remove AI loading spinners and confidence percentage badges.
2. **Text / Content Refactoring**:
   - Replace all copy referencing "AI system", "AI classification", and "AI Engine" with "Municipal Citizen Portal" and "Digital Grievance Redressal".
