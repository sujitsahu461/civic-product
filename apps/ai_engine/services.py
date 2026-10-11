import logging
from typing import Any, Dict, Optional

from apps.ai_engine.category_classifier import CategoryClassifier
from apps.ai_engine.department_classifier import DepartmentClassifier
from apps.ai_engine.priority_classifier import PriorityClassifier
from apps.ai_engine.preprocessing import clean_text

logger = logging.getLogger(__name__)


class AIEngineService:
    """Service orchestrating text preprocessing, vectorization, and ML predictions."""

    @classmethod
    def classify_grievance(
        cls,
        title: str,
        description: str,
        location_address: str = "",
    ) -> Dict[str, Any]:
        """
        Classify civic grievance into one of the 5 official categories:
        1. Drainage -> DRAINAGE
        2. Electricity -> ELECTRICITY
        3. Roads -> ROAD
        4. Sanitation -> SANITATION
        5. Water Supply -> WATER
        """
        text = f"{title} {description}".strip()
        if not text:
            text = str(location_address or "").strip()

        classifier = CategoryClassifier.get_instance()
        return classifier.predict(text)

    @classmethod
    def classify_priority(
        cls,
        title: str,
        description: str,
        category: str = "ROAD",
        location_address: str = "",
    ) -> Dict[str, Any]:
        """
        Predict civic grievance priority using trained ML Pipeline:
        Predicts:
        - MEDIUM -> ComplaintPriority.MEDIUM
        - HIGH -> ComplaintPriority.HIGH
        """
        text = f"{title} {description}".strip()
        if not text:
            text = str(location_address or "").strip()

        classifier = PriorityClassifier.get_instance()
        return classifier.predict(
            text=text,
            category=category,
            location=location_address,
        )

    @classmethod
    def route_department(
        cls,
        title: str,
        description: str,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        location_address: str = "",
    ) -> Dict[str, Any]:
        """
        Route civic grievance to the responsible department.

        Uses the primary 1:1 lookup table with ML cross-checking and fallback.
        If category is omitted, auto-classifies category first.
        If priority is omitted, auto-predicts priority first.
        """
        text = f"{title} {description}".strip()
        if not text:
            text = str(location_address or "").strip()

        resolved_cat = category
        if not resolved_cat:
            cat_res = cls.classify_grievance(
                title=title,
                description=description,
                location_address=location_address,
            )
            resolved_cat = cat_res.get("predicted_category")

        resolved_priority = priority
        if not resolved_priority:
            prio_res = cls.classify_priority(
                title=title,
                description=description,
                category=resolved_cat or "ROAD",
                location_address=location_address,
            )
            resolved_priority = prio_res.get("predicted_priority", "MEDIUM")

        classifier = DepartmentClassifier.get_instance()
        return classifier.predict(
            text=text,
            category=resolved_cat,
            priority=str(resolved_priority),
            location=location_address,
        )


