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
from apps.complaints.models import ComplaintPriority

logger = logging.getLogger(__name__)

# DB ComplaintCategory to ML Model Category mapping
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
}

# Supported Sambalpur reference localities in training dataset
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


class PriorityClassifier:
    """
    Thread-safe lazy singleton priority classifier.
    
    Loads the trained scikit-learn Pipeline (ColumnTransformer + MultinomialNB),
    LabelEncoder, and model metadata on first inference and caches them in memory.
    """

    _instance: Optional["PriorityClassifier"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self._model = None
        self._label_encoder = None
        self._metadata: Dict[str, Any] = {}
        self._load_lock: threading.Lock = threading.Lock()
        self._is_loaded: bool = False

    @classmethod
    def get_instance(cls) -> "PriorityClassifier":
        """Get or initialize singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _ensure_loaded(self) -> None:
        """Lazy load pipeline model, label encoder, and metadata once on first inference."""
        if self._is_loaded:
            return

        with self._load_lock:
            if self._is_loaded:
                return

            base_dir = getattr(settings, "BASE_DIR", Path.cwd())
            if isinstance(base_dir, str):
                base_dir = Path(base_dir)

            model_path = base_dir / "priority_model.pkl"
            encoder_path = base_dir / "priority_label_encoder.pkl"
            meta_path = base_dir / "priority_model_metadata.json"

            if not model_path.exists():
                model_path = Path("priority_model.pkl")
            if not encoder_path.exists():
                encoder_path = Path("priority_label_encoder.pkl")
            if not meta_path.exists():
                meta_path = Path("priority_model_metadata.json")

            logger.info("Loading AI Priority ML model from %s and %s", model_path, encoder_path)

            self._model = joblib.load(model_path)
            self._label_encoder = joblib.load(encoder_path)

            if meta_path.exists():
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        self._metadata = json.load(f)
                except Exception as exc:
                    logger.warning("Could not load priority metadata json: %s", exc)
                    self._metadata = {}

            self._is_loaded = True
            logger.info(
                "AI Priority ML model loaded successfully. Model classes: %s, Encoder classes: %s",
                getattr(self._model, "classes_", []),
                getattr(self._label_encoder, "classes_", []),
            )

    @property
    def metadata(self) -> Dict[str, Any]:
        """Return model metadata dictionary."""
        self._ensure_loaded()
        return self._metadata

    def predict(
        self,
        text: str,
        category: str = "ROAD",
        location: str = "",
    ) -> Dict[str, Any]:
        """
        Classify priority of complaint text, category, and location.

        Returns:
            Dict containing:
            - predicted_priority: DB ComplaintPriority enum value (e.g., 'MEDIUM', 'HIGH')
            - raw_priority: Raw model string label (e.g., 'Medium', 'High')
            - confidence_score: Float probability of the top predicted class
            - probabilities: Dict mapping each class label to its prediction probability
            - model_metadata: Dictionary with model type and limitations
        """
        cleaned_text = clean_text(text)
        self._ensure_loaded()

        # Map input category to model category string
        cat_key = str(category or "").strip().upper()
        model_category = DB_TO_MODEL_CATEGORY_MAP.get(cat_key, "Roads")

        # Resolve location: match known Sambalpur locality or pass raw location string
        resolved_location = str(location or "").strip()
        matched_loc = None
        for known in KNOWN_MODEL_LOCATIONS:
            if known.lower() in resolved_location.lower():
                matched_loc = known
                break
        final_location = matched_loc or resolved_location or "Budharaja"

        # Fallback for empty text
        if not cleaned_text:
            return {
                "predicted_priority": ComplaintPriority.MEDIUM,
                "raw_priority": "Medium",
                "confidence_score": 0.50,
                "probabilities": {"Medium": 0.50, "High": 0.50},
                "model_metadata": self._metadata,
            }

        # Build feature DataFrame matching Pipeline's ColumnTransformer expectations
        input_df = pd.DataFrame(
            [
                {
                    "Cleaned_Complaint_Text": cleaned_text,
                    "Category": model_category,
                    "Location": final_location,
                }
            ]
        )

        try:
            numeric_pred = self._model.predict(input_df)[0]
            proba_array = self._model.predict_proba(input_df)[0]
            model_classes = list(self._model.classes_)

            # Decode numeric prediction via label encoder
            raw_priority = str(self._label_encoder.inverse_transform([numeric_pred])[0])
            pred_idx = model_classes.index(numeric_pred) if numeric_pred in model_classes else 0
            confidence = float(proba_array[pred_idx])

            # Class probabilities map
            decoded_classes = self._label_encoder.inverse_transform(model_classes)
            probabilities_dict = {
                str(cls_name): round(float(prob), 4)
                for cls_name, prob in zip(decoded_classes, proba_array)
            }

            # Map to ComplaintPriority enum
            raw_upper = raw_priority.upper()
            if "HIGH" in raw_upper:
                db_priority = ComplaintPriority.HIGH
            elif "URGENT" in raw_upper:
                db_priority = ComplaintPriority.URGENT
            elif "LOW" in raw_upper:
                db_priority = ComplaintPriority.LOW
            else:
                db_priority = ComplaintPriority.MEDIUM

            return {
                "predicted_priority": db_priority,
                "raw_priority": raw_priority,
                "confidence_score": round(confidence, 4),
                "probabilities": probabilities_dict,
                "model_metadata": self._metadata,
            }
        except Exception as exc:
            logger.error("Error running Priority ML prediction: %s", exc, exc_info=True)
            return {
                "predicted_priority": ComplaintPriority.MEDIUM,
                "raw_priority": "Medium",
                "confidence_score": 0.50,
                "probabilities": {"Medium": 0.50, "High": 0.50},
                "model_metadata": self._metadata,
            }
