import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import pandas as pd
from django.conf import settings

# Cross-version compatibility shim for scikit-learn ColumnTransformer
try:
    import sklearn.compose._column_transformer

    if not hasattr(sklearn.compose._column_transformer, "_RemainderColsList"):

        class _RemainderColsList(list):
            """Compatibility stub for models serialized with scikit-learn 1.6."""

            pass

        sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList
except (ImportError, AttributeError):
    pass

from apps.ai_engine.preprocessing import clean_text

logger = logging.getLogger(__name__)

# Model category names to DB complaint category mapping
DB_TO_MODEL_CATEGORY_MAP: Dict[str, str] = {
    "DRAINAGE": "Drainage",
    "ELECTRICITY": "Electricity",
    "ROAD": "Roads",
    "SANITATION": "Sanitation",
    "WATER": "Water Supply",
    "GARBAGE": "Sanitation",
    "STREET_LIGHT": "Electricity",
    "PARKS": "Roads",
    "NOISE": "Roads",
    "OTHER": "Roads",
    # Direct case-insensitive raw mappings
    "DRAIN": "Drainage",
    "ELECTRIC": "Electricity",
    "ROADS": "Roads",
    "WATER SUPPLY": "Water Supply",
    "SEWAGE": "Drainage",
}

# Model department classes to DB department table name mapping
MODEL_TO_DB_DEPT_MAP: Dict[str, str] = {
    "Public Works": "Road",
    "Water Department": "Water",
    "Electrical": "Electricity",
    "Sewer": "Drainage",
    "Sanitation": "Garbage",
}

# Reverse DB name to Model class mapping
DB_TO_MODEL_DEPT_MAP: Dict[str, str] = {
    "Road": "Public Works",
    "Water": "Water Department",
    "Electricity": "Electrical",
    "Drainage": "Sewer",
    "Garbage": "Sanitation",
    "Sanitation": "Sanitation",
}

# Sambalpur reference localities known to the trained pipeline
KNOWN_MODEL_LOCATIONS = [
    "Ainthapali",
    "Bareipali",
    "Budharaja",
    "Burla",
    "Dhanupali",
    "GM College",
    "Gopalmal",
    "Hirakud",
    "Khetrajpur",
    "Modipara",
    "Sakhipara",
]


class DepartmentClassifier:
    """
    Thread-safe lazy singleton department classifier and routing engine.

    Implements the dual-path decision strategy defined in department_model_metadata.json:
    - Primary Decision Path: department_lookup_table.json (Category -> Department 1:1)
    - ML Cross-Check: department_model.pkl (Logistic Regression Pipeline)
      Flags for human review if ML prediction conflicts with lookup table.
    - ML Fallback: used as primary decision maker when Category is missing or unrecognized.
    """

    _instance: Optional["DepartmentClassifier"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self._model = None
        self._lookup_table: Dict[str, str] = {}
        self._metadata: Dict[str, Any] = {}
        self._load_lock: threading.Lock = threading.Lock()
        self._is_loaded: bool = False

    @classmethod
    def get_instance(cls) -> "DepartmentClassifier":
        """Get or initialize singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _ensure_loaded(self) -> None:
        """Lazy load pipeline model, lookup table, and metadata once on first inference."""
        if self._is_loaded:
            return

        with self._load_lock:
            if self._is_loaded:
                return

            base_dir = getattr(settings, "BASE_DIR", Path.cwd())
            if isinstance(base_dir, str):
                base_dir = Path(base_dir)

            model_path = base_dir / "department_model.pkl"
            lookup_path = base_dir / "department_lookup_table.json"
            meta_path = base_dir / "department_model_metadata.json"

            if not model_path.exists():
                model_path = Path("department_model.pkl")
            if not lookup_path.exists():
                lookup_path = Path("department_lookup_table.json")
            if not meta_path.exists():
                meta_path = Path("department_model_metadata.json")

            logger.info("Loading AI Department ML model from %s and lookup table from %s", model_path, lookup_path)

            self._model = joblib.load(model_path)

            # Load lookup table
            if lookup_path.exists():
                try:
                    with open(lookup_path, "r", encoding="utf-8") as f:
                        self._lookup_table = json.load(f)
                except Exception as exc:
                    logger.warning("Could not load department lookup table json: %s", exc)
                    self._lookup_table = {
                        "Drainage": "Sewer",
                        "Electricity": "Electrical",
                        "Roads": "Public Works",
                        "Sanitation": "Sanitation",
                        "Water Supply": "Water Department",
                    }
            else:
                self._lookup_table = {
                    "Drainage": "Sewer",
                    "Electricity": "Electrical",
                    "Roads": "Public Works",
                    "Sanitation": "Sanitation",
                    "Water Supply": "Water Department",
                }

            # Load metadata
            if meta_path.exists():
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        self._metadata = json.load(f)
                except Exception as exc:
                    logger.warning("Could not load department metadata json: %s", exc)
                    self._metadata = {}

            self._is_loaded = True
            logger.info(
                "AI Department Classifier loaded successfully. Classes: %s, Lookup categories: %s",
                getattr(self._model, "classes_", []),
                list(self._lookup_table.keys()),
            )

    @property
    def lookup_table(self) -> Dict[str, str]:
        """Return the Category -> Department lookup table."""
        self._ensure_loaded()
        return self._lookup_table

    @property
    def metadata(self) -> Dict[str, Any]:
        """Return model metadata dictionary."""
        self._ensure_loaded()
        return self._metadata

    def predict(
        self,
        text: str,
        category: Optional[str] = None,
        priority: Optional[str] = "MEDIUM",
        location: str = "",
    ) -> Dict[str, Any]:
        """
        Route grievance to the appropriate department using lookup table + ML cross-check/fallback.

        Args:
            text: Complaint title and description text.
            category: Optional DB or model category name.
            priority: Optional priority level ("LOW", "MEDIUM", "HIGH", "URGENT").
            location: Address or locality text.

        Returns:
            Dict containing:
            - predicted_department: Final department class (e.g. 'Public Works', 'Water Department')
            - db_department_name: Correlated DB department table name (e.g. 'Road', 'Water')
            - confidence_score: Probability score of the selected/predicted department
            - decision_source: 'lookup_table_verified' | 'lookup_table_flagged' | 'ml_model_fallback'
            - requires_human_review: Boolean flag if ML prediction contradicts lookup table
            - cross_check_status: 'AGREED' | 'DISAGREED' | 'FALLBACK'
            - flag_reason: Detailed reason if flagged for human review, otherwise None
            - ml_predicted_department: Department predicted by the Logistic Regression ML model
            - probabilities: Dict mapping each department class to its probability
            - model_metadata: Loaded metadata dictionary
        """
        self._ensure_loaded()
        cleaned_text = clean_text(text)

        # Normalize category
        model_category: Optional[str] = None
        if category:
            cat_str = str(category).strip()
            # Check direct match in lookup table (e.g., "Roads", "Water Supply")
            if cat_str in self._lookup_table:
                model_category = cat_str
            else:
                cat_upper = cat_str.upper()
                model_category = DB_TO_MODEL_CATEGORY_MAP.get(cat_upper)

        # Normalize priority for model ('High' or 'Medium')
        prio_str = str(priority or "MEDIUM").strip().upper()
        model_priority = "High" if prio_str in ["HIGH", "URGENT"] else "Medium"

        # Resolve location to Sambalpur known locality or default
        resolved_location = str(location or "").strip()
        matched_loc = None
        for known in KNOWN_MODEL_LOCATIONS:
            if known.lower() in resolved_location.lower():
                matched_loc = known
                break
        final_location = matched_loc or "Budharaja"

        # Default features for model inference
        feature_category = model_category or "Roads"
        feature_text = cleaned_text or "civic grievance reported"

        input_df = pd.DataFrame(
            [
                {
                    "Cleaned_Complaint_Text": feature_text,
                    "Category": feature_category,
                    "Priority": model_priority,
                    "Location": final_location,
                }
            ]
        )

        try:
            ml_pred = str(self._model.predict(input_df)[0])
            proba_array = self._model.predict_proba(input_df)[0]
            model_classes = list(self._model.classes_)
            pred_idx = model_classes.index(ml_pred) if ml_pred in model_classes else 0
            ml_confidence = float(proba_array[pred_idx])

            probabilities_dict = {
                str(cls_name): round(float(prob), 4)
                for cls_name, prob in zip(model_classes, proba_array)
            }
        except Exception as exc:
            logger.error("Error executing Department ML model: %s", exc, exc_info=True)
            ml_pred = "Public Works"
            ml_confidence = 0.50
            probabilities_dict = {cls_name: 0.20 for cls_name in self._metadata.get("department_classes", [])}

        # Apply dual-path decision strategy
        if model_category and model_category in self._lookup_table:
            # Primary Path: Lookup table
            lookup_dept = self._lookup_table[model_category]
            final_dept = lookup_dept

            if ml_pred == lookup_dept:
                # ML model agrees with lookup table
                decision_source = "lookup_table_verified"
                cross_check_status = "AGREED"
                requires_human_review = False
                flag_reason = None
                confidence = max(ml_confidence, 0.95)
            else:
                # Discrepancy detected: lookup table takes precedence, but flag for review
                decision_source = "lookup_table_flagged"
                cross_check_status = "DISAGREED"
                requires_human_review = True
                flag_reason = (
                    f"Category '{model_category}' maps to '{lookup_dept}' via lookup table, "
                    f"but ML model predicted '{ml_pred}' ({ml_confidence:.1%}). Flagged for human verification."
                )
                confidence = round(ml_confidence, 4)
        else:
            # Fallback Path: ML model is primary decision maker when category is missing/unrecognized
            final_dept = ml_pred
            decision_source = "ml_model_fallback"
            cross_check_status = "FALLBACK"
            requires_human_review = ml_confidence < 0.60
            flag_reason = (
                f"Category was missing or unrecognized. Routed via ML model fallback with {ml_confidence:.1%} confidence."
                if requires_human_review
                else None
            )
            confidence = round(ml_confidence, 4)

        db_department_name = MODEL_TO_DB_DEPT_MAP.get(final_dept, "Road")

        return {
            "predicted_department": final_dept,
            "db_department_name": db_department_name,
            "confidence_score": round(confidence, 4),
            "decision_source": decision_source,
            "requires_human_review": requires_human_review,
            "cross_check_status": cross_check_status,
            "flag_reason": flag_reason,
            "ml_predicted_department": ml_pred,
            "probabilities": probabilities_dict,
            "model_metadata": self._metadata,
        }
