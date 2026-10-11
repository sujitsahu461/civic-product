# CivicSetu — AI / ML Capabilities and Pipeline Architecture

CivicSetu incorporates an embedded machine learning subsystem (`apps/ai_engine/`) to automate the classification, prioritization, and municipal routing of citizen grievances. All models are trained with scikit-learn and serialized with joblib.

---

## 1. Category Classification Model

- **Model File**: `civicsetu_category_model.pkl`
- **Vectorizer File**: `civicsetu_tfidf_vectorizer.pkl`
- **Preprocessing Script**: `civicsetu_preprocessing.py` / `apps/ai_engine/preprocessing.py`
- **Location**: Project root (loaded by `apps.ai_engine.category_classifier.CategoryClassifier`)
- **Compatibility**: scikit-learn >= 1.4.x, joblib >= 1.3.x

### Input
- Combined complaint text: `f"{title} {description}"`.
- Preprocessing: `clean_text()` converts characters to lowercase, strips URLs, removes special characters and excess whitespace.

### Vectorization
- TF-IDF Vectorizer extracts character and word n-grams from the cleaned text.

### Output
Predicted civic category label along with prediction confidence:
- `DRAINAGE` (Drainage and storm water issues)
- `ELECTRICITY` (Power outages, streetlight failures, damaged cables)
- `ROAD` (Potholes, broken pavement, street obstructions)
- `SANITATION` (Garbage collection, overflowing dumpsters, waste disposal)
- `WATER` (Pipe leakages, contamination, low pressure, broken mains)

---

## 2. Grievance Priority Classification Model

- **Model File**: `priority_model.pkl`
- **Label Encoder File**: `priority_label_encoder.pkl`
- **Metadata File**: `priority_model_metadata.json`
- **Preprocessing Script**: `priority_preprocessing.py`
- **Location**: Project root (loaded by `apps.ai_engine.priority_classifier.PriorityClassifier`)

### Input Features
- `text`: Complaint title and description.
- `category`: Civic category string (e.g., `ROAD`, `WATER`).
- `location`: Optional location address.

### Output
Predicts the operational urgency level:
- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

High-risk keywords (e.g., *sparking, fire, explosion, live wire, gas leak, contaminated water*) automatically cross-validate urgency to ensure critical hazards receive prompt escalation.

---

## 3. Department Routing & Classification Model

- **Model File**: `department_model.pkl`
- **Lookup Table**: `department_lookup_table.json`
- **Metadata File**: `department_model_metadata.json`
- **Preprocessing Script**: `department_preprocessing.py`
- **Location**: Project root (loaded by `apps.ai_engine.department_classifier.DepartmentClassifier`)

### Routing Architecture
1. **Primary Route (Deterministic Lookup)**:
   - `DRAINAGE` → `Sewer`
   - `ELECTRICITY` → `Electrical`
   - `ROAD` → `Public Works`
   - `SANITATION` → `Sanitation`
   - `WATER` → `Water Department`
2. **Secondary Route (Machine Learning Pipeline)**:
   - Multi-feature scikit-learn pipeline evaluating cross-cutting grievances or composite issues.
   - Used for anomaly detection and routing validation.

---

## 4. End-to-End Triage Workflow

```
   Citizen Submission (Title, Description, Location, Photo)
                             │
                             ▼
              [clean_text Preprocessing]
                             │
                             ▼
            [CategoryClassifier (TF-IDF)]
               └─→ Predicts: DRAINAGE / ELECTRICITY / ROAD / SANITATION / WATER
                             │
                             ▼
               [PriorityClassifier (ML)]
               └─→ Evaluates: Urgency level (LOW / MEDIUM / HIGH / URGENT)
                             │
                             ▼
             [DepartmentClassifier / Lookup]
               └─→ Routes: Municipal Department Assignment
                             │
                             ▼
       Complaint Registered & Authority Assigned with Audit Trail
```

---

## 5. Artifact Size & Repository Handling

All model artifacts are lightweight:
- `civicsetu_category_model.pkl`: ~5.1 KB
- `civicsetu_tfidf_vectorizer.pkl`: ~2.8 KB
- `department_model.pkl`: ~7.3 KB
- `priority_model.pkl`: ~6.0 KB
- `priority_label_encoder.pkl`: ~0.4 KB

Because all binaries are well below 10 KB, they are committed directly to the repository without requiring Git LFS, ensuring zero-configuration deployment and offline reproducibility.
