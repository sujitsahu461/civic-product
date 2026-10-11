import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import Avg, Count
from django.utils import timezone

from apps.ai_engine.services import AIEngineService
from apps.ai_predictions.models import AIPredictionLog, SentimentType
from apps.complaints.models import (
    Complaint,
    ComplaintCategory,
    ComplaintPriority,
    ComplaintStatus,
)

logger = logging.getLogger(__name__)

# Category Keyword Taxonomies
CATEGORY_KEYWORDS = {
    ComplaintCategory.ROAD: [
        "pothole", "road", "asphalt", "crater", "divider", "speed bump", "signal",
        "footpath", "pavement", "highway", "flyover", "tar", "lane", "traffic light",
        "pedestrian", "zebra crossing", "manhole cover missing", "street crack"
    ],
    ComplaintCategory.WATER: [
        "water", "pipe", "pipeline", "leak", "leakage", "contamination", "tap",
        "low pressure", "supply", "dirty water", "burst", "tanker", "drinking water",
        "muddy water", "foul smell water", "pipeline damage", "valve"
    ],
    ComplaintCategory.ELECTRICITY: [
        "electricity", "wire", "spark", "short circuit", "blackout", "power cut",
        "pole", "voltage", "transformer", "current", "meter", "shock", "hanging wire",
        "substation", "high voltage", "power outage", "fuse"
    ],
    ComplaintCategory.GARBAGE: [
        "garbage", "waste", "trash", "bin", "dumpster", "dump", "litter",
        "rotting", "refuse", "debris", "plastic waste", "overflowing bin",
        "uncollected trash", "garbage truck", "filth"
    ],
    ComplaintCategory.DRAINAGE: [
        "drain", "drainage", "sewage", "gutter", "manhole", "clogged", "overflowing",
        "choke", "sewer", "foul smell", "stagnant water", "culvert", "drain blockage",
        "wastewater", "blocked drain"
    ],
    ComplaintCategory.SANITATION: [
        "sanitation", "toilet", "public toilet", "hygiene", "open defecation",
        "disinfectant", "cleanliness", "mosquito", "dengue", "pest", "fogging",
        "unsanitary", "public urinal"
    ],
    ComplaintCategory.STREET_LIGHT: [
        "streetlight", "street light", "lamp", "dark", "bulb", "pole light",
        "night light", "illumination", "dark road", "street lamp broken", "flickering"
    ],
    ComplaintCategory.PARKS: [
        "park", "garden", "bench", "tree", "playground", "swing", "grass",
        "fountain", "public park", "walking track", "broken fence", "pruning"
    ],
    ComplaintCategory.NOISE: [
        "noise", "loudspeaker", "music", "construction noise", "sound",
        "horn", "decibel", "generator", "late night music", "industrial noise"
    ],
}

# Critical Hazard Triggers -> Heavy urgency increase
HAZARD_TRIGGERS = {
    "LIVE_WIRE": ["live wire", "hanging wire", "electric shock", "sparking", "spark", "transformer fire"],
    "FIRE_HAZARD": ["fire", "explosion", "spark", "burning", "short circuit"],
    "COLLAPSE_RISK": ["collapsed", "caving in", "deep crater", "structure damage", "falling tree"],
    "FLOOD_RISK": ["severe flood", "submerged", "pipeline burst", "burst pipe", "water entering homes"],
    "HEALTH_HAZARD": ["open manhole", "chemical leak", "gas smell", "septic overflow", "toxic"],
}

# SLA Resolution Time Estimations (Hours)
CATEGORY_SLA_HOURS = {
    ComplaintCategory.ELECTRICITY: 12,
    ComplaintCategory.WATER: 24,
    ComplaintCategory.DRAINAGE: 24,
    ComplaintCategory.ROAD: 48,
    ComplaintCategory.GARBAGE: 24,
    ComplaintCategory.SANITATION: 36,
    ComplaintCategory.STREET_LIGHT: 48,
    ComplaintCategory.PARKS: 72,
    ComplaintCategory.NOISE: 12,
    ComplaintCategory.OTHER: 48,
}


def _tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric words."""
    return re.findall(r"\b[a-z0-9_]{3,}\b", text.lower())


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geodesic distance between two points on Earth in kilometers."""
    r = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


class AITriageService:
    """AI Classification, Priority Prediction, and Hazard Detection."""

    @classmethod
    def classify_complaint(
        cls,
        title: str,
        description: str,
        location_address: str = "",
        save_log: bool = False,
        complaint: Optional[Complaint] = None,
    ) -> Dict[str, Any]:
        """Analyze grievance text to classify category, urgency, hazard tags, and priority."""
        full_text = f"{title} {description} {location_address}".lower()
        tokens = set(_tokenize(full_text))

        # 1. AI ML Category Classification
        ml_prediction = AIEngineService.classify_grievance(
            title=title,
            description=description,
            location_address=location_address,
        )
        best_category = ml_prediction["predicted_category"]
        confidence = ml_prediction["confidence_score"]

        # 2. AI ML Priority Classification
        ml_priority_res = AIEngineService.classify_priority(
            title=title,
            description=description,
            category=best_category,
            location_address=location_address,
        )
        ml_priority = ml_priority_res.get("predicted_priority", ComplaintPriority.MEDIUM)
        ml_priority_conf = ml_priority_res.get("confidence_score", 0.50)

        # 3. AI ML Department Routing (Lookup Table primary + ML cross-check/fallback)
        dept_routing_res = AIEngineService.route_department(
            title=title,
            description=description,
            category=best_category,
            priority=ml_priority,
            location_address=location_address,
        )
        predicted_department = dept_routing_res.get("predicted_department", "Public Works")
        requires_human_review = dept_routing_res.get("requires_human_review", False)

        # Extract detected keywords for response metadata
        detected_keywords: List[str] = []
        for category, keywords in CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if kw in full_text:
                    if kw not in detected_keywords:
                        detected_keywords.append(kw)

        # 4. Hazard and Urgency Scoring
        hazard_tags: List[str] = []
        urgency_score = 35  # baseline medium

        if ml_priority == ComplaintPriority.HIGH:
            urgency_score = max(urgency_score, 55)

        for tag, keywords in HAZARD_TRIGGERS.items():
            for kw in keywords:
                if kw in full_text:
                    if tag not in hazard_tags:
                        hazard_tags.append(tag)
                    urgency_score += 20

        # Adjust score based on detected intensity words
        if any(w in full_text for w in ["urgent", "emergency", "danger", "immediately", "accident", "fatal", "injured"]):
            urgency_score += 15

        urgency_score = min(100, max(10, urgency_score))

        # 5. Derive Priority (fusing ML Priority model with critical hazard/emergency overrides)
        if urgency_score >= 75 or len(hazard_tags) >= 2:
            priority = ComplaintPriority.URGENT
            sentiment = SentimentType.CRITICAL
        elif urgency_score >= 55 or len(hazard_tags) >= 1 or ml_priority == ComplaintPriority.HIGH:
            priority = ComplaintPriority.HIGH
            sentiment = SentimentType.NEGATIVE
        elif urgency_score >= 35 or ml_priority == ComplaintPriority.MEDIUM:
            priority = ComplaintPriority.MEDIUM
            sentiment = SentimentType.NEGATIVE
        else:
            priority = ComplaintPriority.LOW
            sentiment = SentimentType.NEUTRAL

        # 6. SLA estimation
        base_sla = CATEGORY_SLA_HOURS.get(best_category, 48)
        if priority == ComplaintPriority.URGENT:
            estimated_hours = max(6, base_sla // 4)
        elif priority == ComplaintPriority.HIGH:
            estimated_hours = max(12, base_sla // 2)
        else:
            estimated_hours = base_sla

        result = {
            "predicted_category": best_category,
            "confidence_score": confidence,
            "urgency_score": urgency_score,
            "predicted_priority": priority,
            "predicted_department": predicted_department,
            "requires_human_review": requires_human_review,
            "department_routing": dept_routing_res,
            "detected_keywords": detected_keywords[:10],
            "hazard_tags": hazard_tags,
            "sentiment": sentiment,
            "estimated_resolution_hours": estimated_hours,
            "ml_priority_details": {
                "predicted_priority": ml_priority,
                "confidence_score": ml_priority_conf,
                "raw_priority": ml_priority_res.get("raw_priority", "Medium"),
                "probabilities": ml_priority_res.get("probabilities", {}),
            },
        }

        if save_log:
            AIPredictionLog.objects.create(
                complaint=complaint,
                predicted_category=result["predicted_category"],
                confidence_score=result["confidence_score"],
                urgency_score=result["urgency_score"],
                predicted_priority=result["predicted_priority"],
                predicted_department=result["predicted_department"],
                requires_human_review=result["requires_human_review"],
                detected_keywords=result["detected_keywords"],
                hazard_tags=result["hazard_tags"],
                sentiment=result["sentiment"],
                estimated_resolution_hours=result["estimated_resolution_hours"],
            )

        return result


class AIDuplicateDetectorService:
    """Geospatial and text similarity duplicate detection."""

    @classmethod
    def find_potential_duplicates(
        cls,
        title: str,
        description: str,
        category: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: float = 1.5,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Identify open complaints that might be duplicates of the incoming grievance."""
        incoming_tokens = set(_tokenize(f"{title} {description}"))

        # Query active complaints in the same category
        active_complaints = Complaint.objects.filter(
            category=category,
            status__in=[ComplaintStatus.PENDING, ComplaintStatus.IN_PROGRESS],
        ).select_related("citizen")

        matches: List[Dict[str, Any]] = []

        for candidate in active_complaints:
            candidate_tokens = set(_tokenize(f"{candidate.title} {candidate.description}"))
            if not candidate_tokens or not incoming_tokens:
                continue

            # Jaccard text similarity
            intersection = incoming_tokens.intersection(candidate_tokens)
            union = incoming_tokens.union(candidate_tokens)
            text_sim = len(intersection) / len(union) if union else 0.0

            # Geospatial proximity
            distance_km = None
            geo_sim = 0.0
            if (
                latitude is not None
                and longitude is not None
                and candidate.latitude is not None
                and candidate.longitude is not None
            ):
                distance_km = _haversine_distance_km(
                    float(latitude), float(longitude),
                    float(candidate.latitude), float(candidate.longitude),
                )
                if distance_km <= radius_km:
                    # Inverse distance scaling
                    geo_sim = max(0.0, 1.0 - (distance_km / radius_km))

            # Calculate composite similarity score
            if distance_km is not None:
                composite_score = (0.5 * text_sim) + (0.5 * geo_sim)
            else:
                composite_score = text_sim

            # Threshold: >= 0.25 composite similarity or >= 0.35 text similarity
            if composite_score >= 0.25 or text_sim >= 0.35:
                matches.append({
                    "complaint_public_id": candidate.public_id,
                    "tracking_code": candidate.tracking_code,
                    "title": candidate.title,
                    "status": candidate.status,
                    "location_address": candidate.location_address,
                    "distance_km": round(distance_km, 2) if distance_km is not None else None,
                    "similarity_score": round(composite_score, 2),
                    "match_confidence": "HIGH" if composite_score >= 0.60 else ("MEDIUM" if composite_score >= 0.35 else "LOW"),
                    "matched_tokens": list(intersection)[:6],
                })

        # Sort descending by similarity score
        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches[:limit]


class AIInsightService:
    """City-wide predictive civic analytics and hotspot summaries."""

    @classmethod
    def get_city_insights(cls) -> Dict[str, Any]:
        """Aggregate city-wide predictive insights."""
        total_predictions = AIPredictionLog.objects.count()
        avg_urgency = AIPredictionLog.objects.aggregate(avg=Avg("urgency_score"))["avg"] or 50.0

        # Top predicted categories
        top_categories = list(
            AIPredictionLog.objects.values("predicted_category")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # High risk complaints count
        high_hazard_count = AIPredictionLog.objects.filter(urgency_score__gte=75).count()

        # Active complaints by category
        category_distribution = list(
            Complaint.objects.values("category")
            .annotate(total=Count("id"))
            .order_by("-total")
        )

        return {
            "total_ai_scans": total_predictions,
            "average_urgency_index": round(float(avg_urgency), 1),
            "high_hazard_alerts_count": high_hazard_count,
            "top_predicted_categories": top_categories,
            "category_distribution": category_distribution,
            "system_readiness_status": "OPERATIONAL",
            "model_version": "CivicSetu-NLP-Triage-v1.4",
            "last_updated": timezone.now().isoformat(),
        }
