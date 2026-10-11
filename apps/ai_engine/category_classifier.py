import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
from django.conf import settings

from apps.ai_engine.preprocessing import clean_text

logger = logging.getLogger(__name__)

# Category mapping from ML model classes to ComplaintCategory enum string values
MODEL_TO_DB_CATEGORY_MAP: Dict[str, str] = {
    "Drainage": "DRAINAGE",
    "Electricity": "ELECTRICITY",
    "Roads": "ROAD",
    "Sanitation": "SANITATION",
    "Water Supply": "WATER",
}

DB_TO_MODEL_CATEGORY_MAP: Dict[str, str] = {
    v: k for k, v in MODEL_TO_DB_CATEGORY_MAP.items()
}


class CategoryClassifier:
    """
    Thread-safe lazy singleton category classifier.
    
    Loads the TF-IDF vectorizer and trained classification model on first inference
    and caches them in memory to prevent repeated disk I/O per request.
    """

    _instance: Optional["CategoryClassifier"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self._vectorizer = None
        self._model = None
        self._load_lock: threading.Lock = threading.Lock()
        self._is_loaded: bool = False

    @classmethod
    def get_instance(cls) -> "CategoryClassifier":
        """Get or initialize singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _ensure_loaded(self) -> None:
        """Lazy load vectorizer and model once on first inference."""
        if self._is_loaded:
            return

        with self._load_lock:
            if self._is_loaded:
                return

            base_dir = getattr(settings, "BASE_DIR", Path.cwd())
            if isinstance(base_dir, str):
                base_dir = Path(base_dir)

            vectorizer_path = base_dir / "civicsetu_tfidf_vectorizer.pkl"
            model_path = base_dir / "civicsetu_category_model.pkl"

            if not vectorizer_path.exists():
                vectorizer_path = Path("civicsetu_tfidf_vectorizer.pkl")
            if not model_path.exists():
                model_path = Path("civicsetu_category_model.pkl")

            logger.info("Loading AI Category ML models from %s and %s", vectorizer_path, model_path)

            self._vectorizer = joblib.load(vectorizer_path)
            self._model = joblib.load(model_path)
            self._is_loaded = True
            logger.info(
                "AI Category ML models loaded successfully. Supported classes: %s",
                getattr(self._model, "classes_", []),
            )

    def predict(self, text: str) -> Dict[str, Any]:
        """
        Classify text and return predicted DB category, confidence score,
        raw model category, and full class probabilities.
        """
        cleaned = clean_text(text)
        if not cleaned:
            return {
                "predicted_category": "ROAD",
                "confidence_score": 0.50,
                "raw_category": "Roads",
                "probabilities": {cat: 0.20 for cat in MODEL_TO_DB_CATEGORY_MAP.values()},
            }

        self._ensure_loaded()

        features = self._vectorizer.transform([cleaned])
        raw_prediction = self._model.predict(features)[0]
        probabilities_array = self._model.predict_proba(features)[0]

        classes = list(self._model.classes_)
        pred_idx = classes.index(raw_prediction) if raw_prediction in classes else 0
        confidence_score = float(probabilities_array[pred_idx])

        db_category = MODEL_TO_DB_CATEGORY_MAP.get(raw_prediction, "ROAD")

        probabilities_dict = {}
        for class_name, prob in zip(classes, probabilities_array):
            mapped_db_cat = MODEL_TO_DB_CATEGORY_MAP.get(class_name, class_name)
            probabilities_dict[mapped_db_cat] = round(float(prob), 4)

        return {
            "predicted_category": db_category,
            "confidence_score": round(confidence_score, 4),
            "raw_category": raw_prediction,
            "probabilities": probabilities_dict,
        }
